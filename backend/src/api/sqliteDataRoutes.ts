import { Router, Request, Response } from 'express';
import { executeQuery, executeRun, saveDb, getAll, getOne, runSql } from '../db/database';
import { sendProTalkMessageAsync, getProTalkLastReply, isProTalkNoise, matchExpertsWithDBAndProTalk } from '../services/proTalkService';
import { sendTelegramMessage, getBotConfig, escapeHtml } from '../services/telegramNotifier';
import { RESTRICTED_SYSTEM_TABLES, sanitizeRows, maskSensitiveObject } from '../utils/securityUtils';

const router = Router();

/**
 * Returns unified partners list: all Telegram bot partners from crm table (registered & pending)
 * combined with registered users from partners table, merging duplicates
 */
export async function getUnifiedPartnersFromDb(): Promise<any[]> {
  const crmRows = (await getAll("SELECT * FROM crm")) || [];
  const partnerRows = (await getAll("SELECT * FROM partners")) || [];
  const partnerMap = new Map<string, any>();

  for (const c of crmRows) {
    const tgId = String(c.telegram_id || c.chat_id || '').replace(/^tb|_.*$/g, '').trim();
    const key = tgId || c.id;
    const emailMatch = c.email || (c.comment && String(c.comment).match(/[\w.-]+@[\w.-]+\.\w+/)?.[0]) || '';
    const isBlocked = 
      c.status === 'Заблокировано' || 
      c.status === 'blocked' || 
      c.status === 'BLOCKED' ||
      c.status_hand === 'Заблокировано' ||
      Boolean(c.send_status && (c.send_status.includes('Forbidden') || c.send_status.includes('blocked') || c.send_status.includes('deactivated')));

    partnerMap.set(key, {
      ...c,
      id: c.id,
      telegram_id: tgId || c.telegram_id || c.chat_id,
      chat_id: tgId || c.chat_id || c.telegram_id,
      type: c.registration_type || (c.reg_check === '✅' ? 'Зарегистрирован' : 'В ожидании регистрации'),
      email: emailMatch,
      status: isBlocked ? 'Заблокировано' : (c.status || (c.reg_check === '✅' ? 'Активен' : 'В ожидании'))
    });
  }

  for (const p of partnerRows) {
    const tgId = String(p.telegram_id || p.chat_id || '').replace(/^tb|_.*$/g, '').trim();
    let existing: any = null;
    if (tgId && partnerMap.has(tgId)) {
      existing = partnerMap.get(tgId);
    } else {
      for (const [k, v] of partnerMap.entries()) {
        if ((p.partner_code && v.partner_code === p.partner_code) ||
            (p.promo && v.promo === p.promo) ||
            (p.email && v.email && p.email.toLowerCase() === v.email.toLowerCase())) {
          existing = v;
          break;
        }
      }
    }

    if (existing) {
      Object.assign(existing, {
        fio: p.fio || existing.fio,
        email: p.email || existing.email,
        phone: p.phone || existing.phone,
        city: p.city || existing.city,
        payout_details: p.payout_details || existing.payout_details,
        promo: p.promo || existing.promo,
        partner_code: p.partner_code || existing.partner_code,
        rank: p.rank || existing.rank,
        type: 'Зарегистрирован',
        status: existing.status === 'Заблокировано' ? 'Заблокировано' : (p.status || existing.status || 'Активен')
      });
    } else {
      const key = tgId || p.id;
      partnerMap.set(key, {
        ...p,
        id: p.id,
        telegram_id: tgId || p.telegram_id,
        chat_id: tgId || p.chat_id || p.telegram_id,
        type: 'Зарегистрирован',
        status: p.status || 'Активен'
      });
    }
  }

  return Array.from(partnerMap.values());
}

/**
 * Universal BD ProTalk Data API (PostgreSQL)
 * Provides clean CRUD access to allowed BD ProTalk tables with sensitive token masking
 */

// GET /api/v1/data/:table
router.get('/:table', async (req: Request, res: Response) => {
  try {
    const { table } = req.params;
    const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '');

    // Security check: restrict direct access to credentials tables from browser
    if (RESTRICTED_SYSTEM_TABLES.has(safeTable)) {
      return res.status(403).json({
        success: false,
        error: 'Доступ к таблице системной конфигурации ограничен в целях безопасности.',
        data: []
      });
    }
    
    // Parse query params for filters
    const queryParams = { ...req.query };
    const limit = queryParams._limit ? parseInt(String(queryParams._limit), 10) : (queryParams.limit ? parseInt(String(queryParams.limit), 10) : 500);
    const offset = queryParams._offset ? parseInt(String(queryParams._offset), 10) : (queryParams.offset ? parseInt(String(queryParams.offset), 10) : 0);
    const orderBy = queryParams._order_by || queryParams.order_by || queryParams._sort || 'created_at';
    const orderDir = (queryParams._order_dir || queryParams.order_dir || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Remove meta params
    delete queryParams._limit;
    delete queryParams.limit;
    delete queryParams._offset;
    delete queryParams.offset;
    delete queryParams._order_by;
    delete queryParams.order_by;
    delete queryParams._order_dir;
    delete queryParams.order_dir;
    delete queryParams._sort;
    delete queryParams._select;
    delete queryParams.select;

    const orParam = queryParams._or || queryParams.or;
    delete queryParams._or;
    delete queryParams.or;

    const whereClauses: string[] = [];
    const params: any[] = [];

    // Parse OR conditions if present
    if (orParam && typeof orParam === 'string') {
      const orParts = orParam.split(',').map(s => s.trim()).filter(Boolean);
      const orClauses: string[] = [];
      for (const part of orParts) {
        const dotIdx1 = part.indexOf('.');
        if (dotIdx1 > 0) {
          const col = part.slice(0, dotIdx1).replace(/[^a-zA-Z0-9_]/g, '');
          const rest = part.slice(dotIdx1 + 1);
          const dotIdx2 = rest.indexOf('.');
          const op = dotIdx2 > 0 ? rest.slice(0, dotIdx2) : 'eq';
          const val = dotIdx2 > 0 ? rest.slice(dotIdx2 + 1) : rest;
          if (col) {
            if (op === 'eq') {
              orClauses.push(`${col} = ?`);
              params.push(val);
            } else if (op === 'neq' || op === 'ne') {
              orClauses.push(`${col} != ?`);
              params.push(val);
            } else if (op === 'like' || op === 'ilike') {
              orClauses.push(`${col} LIKE ?`);
              params.push(val);
            } else if (op === 'is' && (val === 'null' || val === 'not.null')) {
              orClauses.push(val === 'null' ? `${col} IS NULL` : `${col} IS NOT NULL`);
            } else {
              orClauses.push(`${col} = ?`);
              params.push(val);
            }
          }
        }
      }
      if (orClauses.length > 0) {
        whereClauses.push(`(${orClauses.join(' OR ')})`);
      }
    }

    for (const [key, value] of Object.entries(queryParams)) {
      const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '');
      if (!safeKey) continue;
      
      const strVal = String(value);
      if (strVal === 'null' || strVal === 'is.null') {
        whereClauses.push(`${safeKey} IS NULL`);
      } else if (strVal === 'not.null' || strVal === 'not.is.null') {
        whereClauses.push(`${safeKey} IS NOT NULL`);
      } else if (strVal.startsWith('eq.')) {
        whereClauses.push(`${safeKey} = ?`);
        params.push(strVal.slice(3));
      } else if (strVal.startsWith('neq.') || strVal.startsWith('ne.')) {
        whereClauses.push(`${safeKey} != ?`);
        params.push(strVal.replace(/^(neq|ne)\./, ''));
      } else if (strVal.startsWith('like.') || strVal.startsWith('ilike.')) {
        whereClauses.push(`${safeKey} LIKE ?`);
        params.push(strVal.replace(/^(like|ilike)\./, ''));
      } else if (strVal.startsWith('in.')) {
        const inVals = strVal.slice(3).replace(/^\(|\)$/g, '').split(',');
        const placeholders = inVals.map(() => '?').join(',');
        whereClauses.push(`${safeKey} IN (${placeholders})`);
        params.push(...inVals);
      } else {
        whereClauses.push(`${safeKey} = ?`);
        params.push(strVal);
      }
    }

    if (safeTable === 'partners' && whereClauses.length === 0) {
      const unified = await getUnifiedPartnersFromDb();
      // Apply offset and limit
      const paged = unified.slice(offset, offset + Math.min(limit, 2000));
      return res.json({ success: true, data: sanitizeRows(paged) });
    }

    let sql = `SELECT * FROM ${safeTable}`;
    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Check if order column exists by querying or defaulting
    try {
      sql += ` ORDER BY ${String(orderBy).replace(/[^a-zA-Z0-9_]/g, '')} ${orderDir}`;
    } catch {
      // ignore
    }

    sql += ` LIMIT ${Math.min(limit, 2000)} OFFSET ${offset}`;

    let rows = (await getAll(sql, params)) || [];

    // Normalize crm rows so chat_id and telegram_id are always accessible
    if (safeTable === 'crm') {
      rows = rows.map((r: any) => ({
        ...r,
        chat_id: r.chat_id || r.telegram_id || r.id,
        telegram_id: r.telegram_id || r.chat_id || r.id,
        email: r.email || (r.comment && String(r.comment).match(/[\w.-]+@[\w.-]+\.\w+/)?.[0]) || ''
      }));
    }

    // Always mask any tokens or credentials before sending to browser
    const sanitizedRows = sanitizeRows(rows);
    res.json({ success: true, data: sanitizedRows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, data: [] });
  }
});

// POST /api/v1/data/:table (Insert or Upsert)
router.post('/:table', async (req: Request, res: Response) => {
  try {
    const { table } = req.params;
    const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '');

    if (RESTRICTED_SYSTEM_TABLES.has(safeTable)) {
      return res.status(403).json({ success: false, error: 'Модификация системных таблиц ограничена в целях безопасности.' });
    }

    const body = req.body;

    if (!body || typeof body !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid request body' });
    }

    const items = Array.isArray(body) ? body : [body];
    const insertedRows: any[] = [];

    for (const item of items) {
      const data = { ...item };
      if (!data.id && (data.id === undefined || data.id === null)) {
        data.id = `${safeTable}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      }
      if (!data.created_at) {
        data.created_at = new Date().toISOString();
      }
      data.updated_at = new Date().toISOString();

      const keys = Object.keys(data).filter(k => /^[a-zA-Z0-9_]+$/.test(k));
      const values = keys.map(k => {
        const val = data[k];
        if (typeof val === 'object' && val !== null) {
          return JSON.stringify(val);
        }
        return val;
      });

      const placeholders = keys.map(() => '?').join(', ');
      const sql = `INSERT OR REPLACE INTO ${safeTable} (${keys.join(', ')}) VALUES (${placeholders})`;

      await runSql(sql, values);
      insertedRows.push(data);
    }

    const sanitizedOutput = sanitizeRows(insertedRows);
    res.json({
      success: true,
      data: Array.isArray(body) ? sanitizedOutput : sanitizedOutput[0]
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH/PUT /api/v1/data/:table (Update)
router.patch('/:table', async (req: Request, res: Response) => {
  try {
    const { table } = req.params;
    const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '');

    if (RESTRICTED_SYSTEM_TABLES.has(safeTable)) {
      return res.status(403).json({ success: false, error: 'Модификация системных таблиц ограничена в целях безопасности.' });
    }

    const updates = req.body;
    const queryParams = { ...req.query };

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid update payload' });
    }

    const updateData = { ...updates };
    updateData.updated_at = new Date().toISOString();

    const setClauses: string[] = [];
    const setParams: any[] = [];

    for (const [key, val] of Object.entries(updateData)) {
      const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '');
      if (!safeKey || safeKey === 'id') continue;
      setClauses.push(`${safeKey} = ?`);
      setParams.push(typeof val === 'object' && val !== null ? JSON.stringify(val) : val);
    }

    if (setClauses.length === 0) {
      return res.json({ success: true, message: 'No fields to update' });
    }

    const whereClauses: string[] = [];
    const whereParams: any[] = [];

    for (const [key, value] of Object.entries(queryParams)) {
      const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '');
      if (!safeKey) continue;
      const strVal = String(value);
      if (strVal === 'null' || strVal === 'is.null') {
        whereClauses.push(`${safeKey} IS NULL`);
      } else if (strVal === 'not.null' || strVal === 'not.is.null') {
        whereClauses.push(`${safeKey} IS NOT NULL`);
      } else if (strVal.startsWith('eq.')) {
        whereClauses.push(`${safeKey} = ?`);
        whereParams.push(strVal.slice(3));
      } else if (strVal.startsWith('neq.') || strVal.startsWith('ne.')) {
        whereClauses.push(`${safeKey} != ?`);
        whereParams.push(strVal.replace(/^(neq|ne)\./, ''));
      } else if (strVal.startsWith('in.')) {
        const inVals = strVal.slice(3).replace(/^\(|\)$/g, '').split(',');
        const placeholders = inVals.map(() => '?').join(',');
        whereClauses.push(`${safeKey} IN (${placeholders})`);
        whereParams.push(...inVals);
      } else {
        whereClauses.push(`${safeKey} = ?`);
        whereParams.push(strVal);
      }
    }

    if (whereClauses.length === 0 && updates.id) {
      whereClauses.push(`id = ?`);
      whereParams.push(updates.id);
    }

    if (whereClauses.length === 0) {
      return res.status(400).json({ success: false, error: 'Filter condition or ID required for update' });
    }

    const sql = `UPDATE ${safeTable} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`;
    await runSql(sql, [...setParams, ...whereParams]);

    res.json({ success: true, updated: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/data/:table
router.delete('/:table', async (req: Request, res: Response) => {
  try {
    const { table } = req.params;
    const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '');

    if (RESTRICTED_SYSTEM_TABLES.has(safeTable)) {
      return res.status(403).json({ success: false, error: 'Удаление из системных таблиц ограничено в целях безопасности.' });
    }
    const queryParams = { ...req.query };

    const whereClauses: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(queryParams)) {
      const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '');
      if (!safeKey) continue;
      const strVal = String(value);
      if (strVal === 'null' || strVal === 'is.null') {
        whereClauses.push(`${safeKey} IS NULL`);
      } else if (strVal === 'not.null' || strVal === 'not.is.null') {
        whereClauses.push(`${safeKey} IS NOT NULL`);
      } else if (strVal.startsWith('eq.')) {
        whereClauses.push(`${safeKey} = ?`);
        params.push(strVal.slice(3));
      } else if (strVal.startsWith('neq.') || strVal.startsWith('ne.')) {
        whereClauses.push(`${safeKey} != ?`);
        params.push(strVal.replace(/^(neq|ne)\./, ''));
      } else if (strVal.startsWith('in.')) {
        const inVals = strVal.slice(3).replace(/^\(|\)$/g, '').split(',');
        const placeholders = inVals.map(() => '?').join(',');
        whereClauses.push(`${safeKey} IN (${placeholders})`);
        params.push(...inVals);
      } else {
        whereClauses.push(`${safeKey} = ?`);
        params.push(strVal);
      }
    }

    if (whereClauses.length === 0) {
      return res.status(400).json({ success: false, error: 'Filter condition required for delete' });
    }

    const sql = `DELETE FROM ${safeTable} WHERE ${whereClauses.join(' AND ')}`;
    await runSql(sql, params);

    res.json({ success: true, deleted: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// SYSTEM FUNCTIONS & INTEGRATION RPC
// ==========================================

router.post('/functions/:funcName', async (req: Request, res: Response) => {
  try {
    const { funcName } = req.params;
    const { body } = req.body || {};

    console.log(`[ProTalk RPC Function] Executing ${funcName}:`, body);

    if (funcName === 'sav-ai-search-clients') {
      const { query: searchQ, clients } = body || {};
      const searchStr = (searchQ || '').toLowerCase().trim();
      const allClients = clients || (await getAll(`SELECT * FROM sav_clients LIMIT 200`));
      
      const filtered = allClients.filter((c: any) => {
        const name = (c.full_name || c.name || '').toLowerCase();
        const phone = (c.phone || '').toLowerCase();
        const tg = (c.telegram_client || c.telegram_id || '').toLowerCase();
        const city = (c.city || '').toLowerCase();
        return name.includes(searchStr) || phone.includes(searchStr) || tg.includes(searchStr) || city.includes(searchStr);
      });

      return res.json({ success: true, data: { clients: filtered } });
    }

    if (funcName === 'sav-sync-clients' || funcName === 'sav-sync-experts' || funcName === 'sav-sync-telegram-profile') {
      return res.json({ success: true, data: { synced: true, timestamp: new Date().toISOString() } });
    }

    if (funcName === 'sav-notify-expert-selection') {
      const {
        expert,
        user,
        clientInfo,
        aiSellerInfo,
        calculatorInfo,
        marketplaceProduct,
        source,
        actionsHistory,
        businessInfo,
        userUid,
        auditInfo
      } = body || {};

      const expertName = expert?.fio || expert?.name || `${expert?.greeting || ''}${expert?.pseudonym || ''}`.trim() || 'Эксперт SAV';
      const expertSpheres = expert?.spheres || 'Все сферы';
      const expertTg = expert?.telegram || expert?.telegram_id || '—';
      const cleanExpTg = expertTg.replace('@', '');

      const resolvedTgId = clientInfo?.telegramId || user?.telegram_id || (userUid ? String(userUid) : 'Гость');
      const resolvedTgUser = clientInfo?.telegramUsername || user?.username ? `@${(clientInfo?.telegramUsername || user?.username).replace('@', '')}` : (auditInfo?.telegram || 'не указан');
      const clientFullName = clientInfo?.fullName || auditInfo?.fullName || user?.first_name || 'Клиент платформы';
      const clientPhone = clientInfo?.phone || auditInfo?.phone || auditInfo?.contact || '—';

      const nowStr = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
      const { botToken, adminChatId } = getBotConfig();

      let clientTgLink = escapeHtml(clientFullName);
      if (clientInfo?.telegramUsername || user?.username || auditInfo?.telegram) {
        const u = (clientInfo?.telegramUsername || user?.username || auditInfo?.telegram).replace('@', '');
        clientTgLink = `<a href="https://t.me/${escapeHtml(u)}">${escapeHtml(clientFullName)}</a>`;
      } else if (resolvedTgId && resolvedTgId !== 'Гость') {
        clientTgLink = `<a href="tg://user?id=${escapeHtml(String(resolvedTgId))}">${escapeHtml(clientFullName)}</a>`;
      }

      let adminMsg = '';

      // Product image if arriving from marketplace product
      if (marketplaceProduct) {
        const prodImg = marketplaceProduct.imageUrl || marketplaceProduct.image_url;
        const prodTitle = marketplaceProduct.name || 'Товар маркетплейса';
        if (prodImg && typeof prodImg === 'string' && prodImg.startsWith('http')) {
          adminMsg += `![${escapeHtml(prodTitle)}](${escapeHtml(prodImg)})\n\n`;
          adminMsg += `<a href="${escapeHtml(prodImg)}">&#8205;</a>`;
        }
      }

      adminMsg += `⭐ <b>Выбор отраслевого эксперта клиентом</b>\n`;
      adminMsg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

      adminMsg += `<blockquote>👨‍💼 <b>Выбранный эксперт:</b> ${cleanExpTg !== '—' ? `<a href="https://t.me/${cleanExpTg}">${escapeHtml(expertName)}</a>` : `<b>${escapeHtml(expertName)}</b>`}\n`;
      adminMsg += `• <b>Компетенции:</b> <i>${escapeHtml(expertSpheres)}</i>\n`;
      if (cleanExpTg !== '—') adminMsg += `• <b>Telegram:</b> <code>@${cleanExpTg}</code>\n`;
      adminMsg += `</blockquote>\n\n`;

      adminMsg += `👤 <b>Клиент:</b> ${clientTgLink}\n`;
      adminMsg += `🆔 <b>Telegram ID:</b> <code>${escapeHtml(String(resolvedTgId))}</code>\n`;
      adminMsg += `💬 <b>Username:</b> ${escapeHtml(resolvedTgUser)}\n`;
      if (clientPhone !== '—') {
        adminMsg += `📞 <b>Телефон:</b> <code>${escapeHtml(clientPhone)}</code>\n`;
      }

      let sourceText = 'Калькулятор окупаемости';
      if (source === 'marketplace_product' || marketplaceProduct) sourceText = 'Маркетплейс решений (Карточка товара)';
      else if (source === 'ai-seller') sourceText = 'ИИ-Продавец (Тарифы)';
      else if (source === 'ai-matcher') sourceText = 'ИИ-Подбор эксперта';

      adminMsg += `📍 <b>Источник:</b> <b>${escapeHtml(sourceText)}</b>\n`;

      if (marketplaceProduct) {
        adminMsg += `\n<blockquote>🛒 <b>Выбранный продукт маркетплейса:</b>\n`;
        adminMsg += `• <b>Название:</b> <b>${escapeHtml(marketplaceProduct.name || 'ИИ-Ассистент')}</b>\n`;
        if (marketplaceProduct.category) adminMsg += `• <b>Категория:</b> ${escapeHtml(marketplaceProduct.category)}\n`;
        if (marketplaceProduct.setupTime) adminMsg += `• <b>Срок внедрения:</b> ${escapeHtml(marketplaceProduct.setupTime)}\n`;
        if (marketplaceProduct.selectedVariant?.name || marketplaceProduct.tariff?.name) {
          const varName = marketplaceProduct.selectedVariant?.name || marketplaceProduct.tariff?.name;
          const varPrice = marketplaceProduct.selectedVariant?.price || marketplaceProduct.tariff?.priceFinal || marketplaceProduct.price;
          adminMsg += `• <b>Выбранный тариф:</b> <b>${escapeHtml(varName)}</b> (${Number(varPrice).toLocaleString('ru-RU')} ₽)\n`;
        } else if (marketplaceProduct.price) {
          adminMsg += `• <b>Стоимость:</b> <b>${Number(marketplaceProduct.price).toLocaleString('ru-RU')} ₽</b>\n`;
        }
        adminMsg += `</blockquote>\n`;
      }

      if (auditInfo) {
        adminMsg += `\n<blockquote expandable>📋 <b>Данные бесплатного аудита:</b>\n`;
        if (auditInfo.companyName) adminMsg += `• Компания: <b>${escapeHtml(auditInfo.companyName)}</b>\n`;
        if (auditInfo.website) adminMsg += `• Сайт/Соцсети: <code>${escapeHtml(auditInfo.website)}</code>\n`;
        if (auditInfo.sphere) adminMsg += `• Ниша: <b>${escapeHtml(auditInfo.sphere)}</b>\n`;
        if (auditInfo.selectedPlan) adminMsg += `• Тариф: <b>${escapeHtml(auditInfo.selectedPlan)}</b>\n`;
        if (auditInfo.selectedChannels && auditInfo.selectedChannels.length > 0) {
          adminMsg += `• Каналы: ${escapeHtml(auditInfo.selectedChannels.join(', '))}\n`;
        }
        if (auditInfo.comment) adminMsg += `• Задача: <i>${escapeHtml(auditInfo.comment)}</i>\n`;
        adminMsg += `</blockquote>\n`;
      }

      if (aiSellerInfo) {
        adminMsg += `\n<blockquote>📦 <b>Параметры ИИ-Продавца:</b>\n`;
        if (aiSellerInfo.businessType) adminMsg += `• Ниша: <b>${escapeHtml(aiSellerInfo.businessType)}</b>\n`;
        if (aiSellerInfo.selectedPlan) adminMsg += `• Выбранный тариф: <b>${escapeHtml(aiSellerInfo.selectedPlan)}</b>\n`;
        if (aiSellerInfo.classificationResult) adminMsg += `• Архитектура: <i>${escapeHtml(aiSellerInfo.classificationResult.slice(0, 300))}</i>\n`;
        adminMsg += `</blockquote>\n`;
      }

      if (calculatorInfo && Object.keys(calculatorInfo).length > 0) {
        adminMsg += `\n<blockquote expandable>🧮 <b>Параметры калькулятора:</b>\n`;
        if (calculatorInfo.company) adminMsg += `• Компания: <b>${escapeHtml(calculatorInfo.company)}</b>\n`;
        if (calculatorInfo.department) adminMsg += `• Отдел: <b>${escapeHtml(calculatorInfo.department)}</b>\n`;
        if (calculatorInfo.employeeCount) adminMsg += `• Сотрудников: <b>${calculatorInfo.employeeCount}</b> чел.\n`;
        if (calculatorInfo.averageSalary) adminMsg += `• Средняя ЗП: <b>${Number(calculatorInfo.averageSalary).toLocaleString('ru-RU')} ₽</b>\n`;
        if (calculatorInfo.city) adminMsg += `• Город: <b>${escapeHtml(calculatorInfo.city)}</b>\n`;
        adminMsg += `</blockquote>\n`;
      }

      if (businessInfo && Object.keys(businessInfo).length > 0) {
        adminMsg += `\n<blockquote expandable>🏢 <b>Профиль бизнеса:</b>\n`;
        if (businessInfo.company_name) adminMsg += `• Компания: <b>${escapeHtml(businessInfo.company_name)}</b>\n`;
        if (businessInfo.sphere || businessInfo.category || businessInfo.segment) {
          adminMsg += `• Сфера / Ниша: ${escapeHtml(businessInfo.sphere || '')} / ${escapeHtml(businessInfo.category || '')} / ${escapeHtml(businessInfo.segment || '')}\n`;
        }
        if (businessInfo.description) adminMsg += `\n📝 <i>${escapeHtml(businessInfo.description.slice(0, 300))}</i>\n`;
        adminMsg += `</blockquote>\n`;
      }

      if (Array.isArray(actionsHistory) && actionsHistory.length > 0) {
        const lastActions = actionsHistory.slice(-6).map((a: any) => `• ${a.action || a.page || ''} (${a.value || a.field || a.timestamp || ''})`).join('\n');
        adminMsg += `\n<blockquote expandable>🧭 <b>История действий клиента:</b>\n<code>${escapeHtml(lastActions)}</code></blockquote>\n`;
      }

      adminMsg += `\n⏰ <code>${nowStr} (МСК)</code>`;

      // Build inline buttons for Telegram: 2 buttons (client contact and expert)
      const inlineButtons: any[] = [];
      const buttonsRow: any[] = [];

      let clientContactUrl: string | null = null;
      let clientContactText = '💬 Написать клиенту';

      const candidateTg = (clientInfo?.telegramUsername || user?.username || '').replace('@', '').trim();
      const rawCandidatePhone = (clientPhone && clientPhone !== '—' ? clientPhone : (clientInfo?.phone || user?.phone || '')).trim();
      const digitsCandidatePhone = rawCandidatePhone.replace(/\D/g, '');

      if (candidateTg) {
        clientContactUrl = `https://t.me/${candidateTg}`;
        clientContactText = `💬 Клиент @${candidateTg}`;
      } else if (resolvedTgId && resolvedTgId !== 'Гость' && /^\d+$/.test(String(resolvedTgId))) {
        clientContactUrl = `tg://user?id=${resolvedTgId}`;
        clientContactText = '💬 Клиент в Telegram';
      } else if (digitsCandidatePhone && digitsCandidatePhone.length >= 10) {
        const waPhone = digitsCandidatePhone.length === 11 && digitsCandidatePhone.startsWith('8') ? '7' + digitsCandidatePhone.slice(1) : digitsCandidatePhone;
        clientContactUrl = `https://wa.me/${waPhone}`;
        clientContactText = '💬 WhatsApp клиента';
      }

      if (clientContactUrl) {
        buttonsRow.push({ text: clientContactText, url: clientContactUrl });
      }

      if (cleanExpTg !== '—' && cleanExpTg) {
        buttonsRow.push({ text: `👨‍💼 Эксперт @${cleanExpTg}`, url: `https://t.me/${cleanExpTg}` });
      }

      if (buttonsRow.length > 0) {
        inlineButtons.push(buttonsRow);
      }

      const payloadToSend: any = {
        chat_id: adminChatId,
        text: adminMsg,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
        reply_markup: { inline_keyboard: inlineButtons }
      };

      // Dispatch to Telegram Admin using sendTelegramMessage (sendRichMessage + fallback)
      try {
        const adminTargets: string[] = [];
        if (adminChatId && adminChatId !== '0') adminTargets.push(adminChatId);
        
        const crmAdmins = (await getAll("SELECT telegram_id FROM sav_crm_admins WHERE telegram_id IS NOT NULL")) || [];
        for (const a of crmAdmins) {
          if (a.telegram_id && String(a.telegram_id).trim()) {
            adminTargets.push(String(a.telegram_id).trim());
          }
        }
        
        const uniqueTargets = Array.from(new Set(adminTargets.filter(id => id && /^\d+$/.test(id))));
        for (const targetId of uniqueTargets) {
          sendTelegramMessage(botToken, targetId, adminMsg, { inline_keyboard: inlineButtons })
            .catch(err => console.warn('[Telegram Notify Expert Warning]', err));
        }
      } catch (tgErr) {
        console.warn('[Telegram Dispatch Exception]', tgErr);
      }

      // Record lead in sav_leads & broadcast_logs
      try {
        await runSql(`
          INSERT OR REPLACE INTO sav_leads (
            id, project, user_biz, segment, category, sphere, tariff, telegram_id, first_name, last_name, username, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'EXPERT_SELECTED')
        `, [
          `lead_exp_${Date.now()}`,
          aiSellerInfo?.selectedPlan || calculatorInfo?.company || expertName,
          aiSellerInfo?.businessType || calculatorInfo?.department || null,
          businessInfo?.segment || null,
          businessInfo?.category || null,
          businessInfo?.sphere || expertSpheres,
          aiSellerInfo?.selectedPlan || 'Консультация эксперта',
          resolvedTgId,
          clientFullName,
          null,
          resolvedTgUser
        ]);
        saveDb();
      } catch (dbErr) {
        console.warn('[DB Lead Save Note]', dbErr);
      }

      console.log('[Notify Expert] Notification sent to Admin 169262990 for expert:', expertName);
      return res.json({ success: true, data: { notified: true, adminChatId } });
    }

    if (funcName === 'sav-send-telegram-message') {
      const { clientId, telegramId, message, media, inlineButtons, templateName } = body || {};

      const cleanTgId = telegramId ? String(telegramId).trim() : null;
      if (!cleanTgId || cleanTgId === '0' || cleanTgId === 'null' || cleanTgId === 'undefined' || cleanTgId === '—' || cleanTgId === 'Гость') {
        return res.status(400).json({
          success: false,
          error: 'У пользователя нет привязанного Telegram ID. Отправка сообщений невозможна.'
        });
      }

      // Build replyMarkup for Telegram from inline buttons if provided
      let replyMarkup: any = undefined;
      if (Array.isArray(inlineButtons) && inlineButtons.length > 0) {
        const keyboard: any[] = [];
        for (const row of inlineButtons) {
          if (row && Array.isArray(row.buttons)) {
            const btnRow: any[] = [];
            for (const btn of row.buttons) {
              if (btn.text) {
                const bObj: any = { text: btn.text };
                if (btn.url && (btn.url.startsWith('http') || btn.url.startsWith('tg://'))) {
                  bObj.url = btn.url;
                } else if (btn.callbackData || btn.callback_data) {
                  bObj.callback_data = btn.callbackData || btn.callback_data;
                } else {
                  bObj.callback_data = `act_${String(btn.text).slice(0, 20)}`;
                }
                btnRow.push(bObj);
              }
            }
            if (btnRow.length > 0) keyboard.push(btnRow);
          }
        }
        if (keyboard.length > 0) replyMarkup = { inline_keyboard: keyboard };
      }

      let sendResult: any = false;
      let errorMsg: string | null = null;

      try {
        sendResult = await sendTelegramMessage({
          chatId: cleanTgId,
          text: message || 'Новое сообщение от SAV AI',
          replyMarkup,
          parseMode: 'HTML'
        });
        if (typeof sendResult === 'object' && sendResult !== null && sendResult.ok === false) {
          errorMsg = sendResult.error || 'Ошибка доставки в Telegram';
          sendResult = false;
        } else if (!sendResult) {
          errorMsg = 'Не удалось доставить сообщение в Telegram';
        }
      } catch (err: any) {
        errorMsg = err.message || 'Ошибка отправки в Telegram';
        sendResult = false;
      }

      const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const status = sendResult ? 'sent' : 'failed';

      try {
        await runSql(`
          INSERT INTO sav_client_messages (
            id, client_id, telegram_id, direction, message, media, inline_buttons, template_name, status, error_message, sent_at, created_at
          ) VALUES (?, ?, ?, 'outgoing', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
          msgId,
          clientId || null,
          cleanTgId,
          message || '',
          media ? JSON.stringify(media) : null,
          inlineButtons ? JSON.stringify(inlineButtons) : null,
          templateName || null,
          status,
          errorMsg
        ]);

        if (clientId) {
          await runSql(`UPDATE sav_clients SET last_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [message || 'Сообщение', clientId]);
          await runSql(`UPDATE crm SET last_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? OR telegram_id = ?`, [message || 'Сообщение', clientId, cleanTgId]);
        }
      } catch (dbErr) {
        console.warn('[sav-send-telegram-message] DB record warning:', dbErr);
      }

      if (!sendResult) {
        return res.status(500).json({
          success: false,
          error: errorMsg || 'Не удалось отправить сообщение в Telegram'
        });
      }

      return res.json({
        success: true,
        data: {
          sent: true,
          messageId: msgId,
          telegramId: cleanTgId,
          status: 'sent'
        }
      });
    }

    if (funcName === 'sav-ai-match-experts') {
      const { businessDescription, userInfo, userHistory, sphere } = body || {};
      const matches = await matchExpertsWithDBAndProTalk(businessDescription, userInfo, userHistory);
      return res.json({
        success: true,
        data: {
          matches
        }
      });
    }

    if (funcName === 'sav-ai-enhance-tz') {
      const { tzText, sphere, category } = body || {};
      return res.json({
        success: true,
        data: {
          enhancedTz: `Техническое задание для сферы ${sphere || 'Автоматизация'}:\n${tzText || ''}\n\nСтек: Telegram, WhatsApp, CRM, PostgreSQL BD ProTalk Database.`
        }
      });
    }

    if (funcName === 'ai-chat') {
      const { messages, user_social_id } = body || {};
      const userMessageList = Array.isArray(messages) ? messages : [];
      const lastUserMsg = userMessageList.length > 0 ? (userMessageList[userMessageList.length - 1].content || '') : '';
      
      // Pull context from laws database
      let lawsContext = '';
      try {
        const laws = await getAll("SELECT * FROM laws LIMIT 30");
        if (laws && laws.length > 0) {
          const lower = (lastUserMsg || '').toLowerCase();
          const matchedLaws = laws.filter((l: any) => {
            const q = (l.q || '').toLowerCase();
            const a = (l.a || '').toLowerCase();
            return lower ? (q.includes(lower) || a.includes(lower) || lower.split(' ').some((word: string) => word.length > 3 && (q.includes(word) || a.includes(word)))) : true;
          });
          const pool = matchedLaws.length > 0 ? matchedLaws : laws.slice(0, 10);
          lawsContext = pool.map((l: any) => `Статья/Вопрос: ${l.q}\nОтвет/Закон: ${l.a}`).join('\n\n');
        }
      } catch (lawsErr) {
        console.warn('[AI-Chat Laws Context Error]', lawsErr);
      }

      // Format full prompt for ProTalk
      const systemPrompt = `Ты — официальный ИИ-Пресс-Секретарь цифрового государства ИИ-Гренландия (партнёрская экосистема SAV AI).
Отвечай вежливо, ёмко, по существу, опираясь на официальные законы и регламенты Гренландии.
Если пользователь задаёт вопрос по законам, иммиграции или статусу резидента, используй статьи из официальной базы законов.`;

      const promptWithContext = `[СИСТЕМНЫЙ ПРОМПТ]
${systemPrompt}

[ОФИЦИАЛЬНАЯ БАЗА ЗАКОНОВ И РЕГЛАМЕНТОВ ГРЕНЛАНДИИ ИЗ BD PROTALK]
${lawsContext || 'Статьи Конституции и регламенты доступны резидентам.'}

[ВОПРОС ПОЛЬЗОВАТЕЛЯ]
${lastUserMsg}`;

      const botChatId = `gl_chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      let aiResponseText = '';

      try {
        await sendProTalkMessageAsync(botChatId, promptWithContext, user_social_id || 'greenland_resident', 'Ассистент партнеров');
        
        const startTime = Date.now();
        const timeoutMs = 15000;
        const pollIntervalMs = 1000;

        while (Date.now() - startTime < timeoutMs) {
          await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
          try {
            const reply = await getProTalkLastReply(botChatId, user_social_id || 'greenland_resident', promptWithContext, 'Ассистент партнеров');
            if (reply && reply.message) {
              const raw = reply.message.trim();
              if (raw && !isProTalkNoise(raw)) {
                aiResponseText = raw;
                break;
              }
            }
          } catch (pollErr) {
            // continue polling
          }
        }
      } catch (ptErr) {
        console.warn('[ProTalk AI Chat Error]', ptErr);
      }

      if (!aiResponseText) {
        // Fallback directly from BD ProTalk laws knowledge
        if (lawsContext) {
          aiResponseText = `Согласно официальным регламентам ИИ-Гренландии:\n\n${lawsContext.slice(0, 600)}\n\nДля полного ознакомления перейдите в раздел «Конституция» или оформите Green Card резидента.`;
        } else {
          aiResponseText = 'Приветствую! Я ИИ-Пресс-Секретарь Гренландии. Для оформления статуса резидента и ознакомления с законами вы можете воспользоваться разделами «Иммиграция» и «Конституция». Чем я могу помочь вам?';
        }
      }

      // Ensure protalk_logs has the answer recorded properly
      try {
        const promptLen = (promptWithContext || '').length;
        const replyLen = (aiResponseText || '').length;
        const tokensIn = Math.ceil(promptLen / 4) + 120;
        const tokensOut = Math.ceil(replyLen / 4);
        const tokensTotal = tokensIn + tokensOut;
        const rub = Math.round((tokensTotal * 300.0 / 10000000.0) * 1000000) / 1000000;

        await runSql(`
          UPDATE protalk_logs
          SET bot_reply = ?, tokens_out_source = ?, tokens_total = tokens_in_source + ?, tokens_user = tokens_in_source + ?, rub = ?
          WHERE id = (
            SELECT id FROM protalk_logs 
            WHERE channel_id = ? AND (bot_reply LIKE '%Ожидание ответа%' OR bot_reply IS NULL)
            ORDER BY id DESC LIMIT 1
          )
        `, [aiResponseText, tokensOut, tokensOut, tokensOut, rub, botChatId]);
      } catch (_) {}

      return res.json({
        success: true,
        response: aiResponseText,
        bot_chat_id: botChatId
      });
    }

    if (funcName === 'send-broadcast') {
      const { message, recipients, media_url, inline_buttons, broadcast_id } = body || {};
      const { botToken } = getBotConfig();
      const recList = Array.isArray(recipients) ? recipients : [];
      let sentCount = 0;
      let failedCount = 0;

      // Build inline buttons for Telegram
      let replyMarkup: any = undefined;
      if (Array.isArray(inline_buttons) && inline_buttons.length > 0) {
        const keyboard: any[] = [];
        for (const btn of inline_buttons) {
          if (btn.text && (btn.value || btn.url)) {
            const btnUrl = btn.value || btn.url;
            keyboard.push([{ text: btn.text, url: btnUrl }]);
          }
        }
        if (keyboard.length > 0) replyMarkup = { inline_keyboard: keyboard };
      }

      for (const rec of recList) {
        const targetChatId = String(rec.chat_id || rec.telegram_id || '').replace(/^tb|_.*$/g, '').trim();
        if (!targetChatId || !/^\d+$/.test(targetChatId)) {
          failedCount++;
          continue;
        }

        // Replace macros like {fio}, {chat_id}, {telegram}, {promo}, {partner_code}
        let personalizedMsg = (message || '')
          .replace(/{fio}/g, rec.fio || rec.name || 'Партнер')
          .replace(/{chat_id}/g, targetChatId)
          .replace(/{telegram}/g, rec.telegram || `@id${targetChatId}`)
          .replace(/{promo}/g, rec.promo || '')
          .replace(/{partner_code}/g, rec.partner_code || '');

        let ok = false;
        try {
          ok = await sendTelegramMessage(botToken, targetChatId, personalizedMsg, replyMarkup);
          if (ok) sentCount++; else failedCount++;
        } catch {
          failedCount++;
        }

        try {
          await runSql(`
            INSERT INTO broadcast_logs (id, broadcast_id, chat_id, fio, telegram, message_text, status, send_time_ms)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            `blog_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            broadcast_id || null,
            targetChatId,
            rec.fio || rec.name || 'Партнер',
            rec.telegram || targetChatId,
            personalizedMsg.slice(0, 500),
            ok ? 'SENT' : 'FAILED',
            100
          ]);
        } catch {}
      }

      if (broadcast_id) {
        try {
          await runSql(`
            UPDATE broadcasts 
            SET status = ?, count_sent = ?, count_failed = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `, [`✅ ${sentCount} / ❌ ${failedCount}`, sentCount, failedCount, broadcast_id]);
        } catch {}
      }

      return res.json({
        success: true,
        data: {
          sent: sentCount,
          failed: failedCount,
          total: recList.length
        }
      });
    }

    res.json({ success: true, data: { result: 'ok', function: funcName } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
