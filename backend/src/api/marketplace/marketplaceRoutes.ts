import { Router, Request, Response } from 'express';
import { executeQuery, executeRun, saveDb, query, runSql } from '../../db/database';
import { safeParseJson, fetchUrlText, sanitizeTabString, parseCsvRows, CYR_TO_LAT } from './marketplaceUtils';

const router = Router();

// 1. Get All Marketplace Products (Fast async non-blocking query)
router.get('/products', async (req: Request, res: Response) => {
  try {
    const rows = await query(`
      SELECT id, tilda_uid, sku, brand, name, category, niche, short_description, 
             price, max_price, period, image_url, demo_url, url, 
             is_popular, rating, sales_count, setup_time, created_at 
      FROM marketplace_products 
      ORDER BY is_popular DESC NULLS LAST, sales_count DESC NULLS LAST, created_at DESC NULLS LAST
    `);

    const products = rows.map((r: any) => ({
      id: r.id,
      tildaUid: r.tilda_uid || r.id,
      sku: r.sku || '',
      brand: r.brand || 'SAV AI',
      name: r.name,
      category: r.category,
      niche: r.niche || '',
      shortDescription: r.short_description || '',
      fullDescription: r.full_description || '',
      textHtml: r.text_html || null,
      modificationsText: r.modifications_text || null,
      price: Number(r.price) || 0,
      maxPrice: Number(r.max_price) || 0,
      period: r.period || 'руб',
      imageUrl: r.image_url || '',
      demoUrl: r.demo_url || 'https://t.me/SAVPartnerBot',
      url: r.url || null,
      seoTitle: r.seo_title || null,
      seoDescr: r.seo_descr || null,
      seoKeywords: r.seo_keywords || null,
      fbTitle: r.fb_title || null,
      fbDescr: r.fb_descr || null,
      tabs: safeParseJson(r.tabs, []),
      variants: safeParseJson(r.variants, []),
      features: safeParseJson(r.features, []),
      integrations: safeParseJson(r.integrations, []),
      isPopular: Boolean(r.is_popular === 1 || r.is_popular === true || r.is_popular === '1' || r.is_popular === 'true'),
      rating: Number(r.rating) || 4.9,
      salesCount: Number(r.sales_count) || 0,
      setupTime: r.setup_time || '2 часа'
    }));

    res.json({ success: true, products, count: products.length });
  } catch (err: any) {
    console.error('Error fetching marketplace products:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});



function slugifyName(name: string): string {
  if (!name) return '';
  const lower = name.toLowerCase().trim();
  let res = '';
  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i];
    if (CYR_TO_LAT[ch] !== undefined) res += CYR_TO_LAT[ch];
    else if (/[a-z0-9]/.test(ch)) res += ch;
    else if (/\s|_|-|\/|\\|\.|,/.test(ch)) {
      if (!res.endsWith('-')) res += '-';
    }
  }
  return res.replace(/^-+|-+$/g, '').replace(/-+/g, '-');
}

// 2. Get Single Marketplace Product by ID, SKU, tildaUid or Slug
router.get('/products/:idOrSlug', async (req: Request, res: Response) => {
  try {
    const { idOrSlug } = req.params;
    const cleanTarget = (idOrSlug || '').toLowerCase().trim();

    // 1. Direct query by ID, tilda_uid, SKU or URL
    let rows = await query(`
      SELECT * FROM marketplace_products 
      WHERE id = $1 OR tilda_uid = $1 OR sku = $1 OR url LIKE $2
      LIMIT 1
    `, [idOrSlug, `%${idOrSlug}%`]);

    // 2. If not found directly, search by slug or name transliteration
    if (!rows || rows.length === 0) {
      const allRows = await query(`SELECT * FROM marketplace_products`);
      const matched = allRows.find((r: any) => {
        if (r.id && String(r.id).toLowerCase() === cleanTarget) return true;
        if (r.tilda_uid && String(r.tilda_uid).toLowerCase() === cleanTarget) return true;
        if (r.sku && String(r.sku).toLowerCase() === cleanTarget) return true;
        if (r.url && String(r.url).toLowerCase().includes(cleanTarget)) return true;
        
        if (r.name) {
          const s = slugifyName(r.name);
          if (s === cleanTarget) return true;
          if (cleanTarget.startsWith(s) || s.startsWith(cleanTarget)) return true;

          const normS = s.replace(/[^a-z0-9]/g, '');
          const normTarget = cleanTarget.replace(/[^a-z0-9]/g, '');
          if (normS && normTarget && (normS.includes(normTarget) || normTarget.includes(normS))) {
            return true;
          }
        }
        return false;
      });

      if (matched) {
        rows = [matched];
      }
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const r = rows[0];
    const product = {
      id: r.id,
      tildaUid: r.tilda_uid || r.id,
      sku: r.sku || '',
      brand: r.brand || 'SAV AI',
      name: r.name,
      category: r.category,
      niche: r.niche || '',
      shortDescription: r.short_description || '',
      fullDescription: r.full_description || '',
      textHtml: r.text_html || null,
      modificationsText: r.modifications_text || null,
      price: Number(r.price) || 0,
      maxPrice: Number(r.max_price) || 0,
      period: r.period || 'руб',
      imageUrl: r.image_url || '',
      demoUrl: r.demo_url || 'https://t.me/SAVPartnerBot',
      url: r.url || null,
      seoTitle: r.seo_title || null,
      seoDescr: r.seo_descr || null,
      seoKeywords: r.seo_keywords || null,
      fbTitle: r.fb_title || null,
      fbDescr: r.fb_descr || null,
      tabs: safeParseJson(r.tabs, []),
      variants: safeParseJson(r.variants, []),
      features: safeParseJson(r.features, []),
      integrations: safeParseJson(r.integrations, []),
      isPopular: Boolean(r.is_popular === 1 || r.is_popular === true || r.is_popular === '1' || r.is_popular === 'true'),
      rating: Number(r.rating) || 4.9,
      salesCount: Number(r.sales_count) || 0,
      setupTime: r.setup_time || '2 часа'
    };

    res.json({ success: true, product });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2.5. Get Implementation Algorithms (50 ready-to-use business scenarios)
router.get('/algorithms', async (req: Request, res: Response) => {
  try {
    const { q, search, sphere, category, popular } = req.query;
    const searchTerm = (typeof q === 'string' ? q : typeof search === 'string' ? search : '').trim();
    const sphereFilter = typeof sphere === 'string' ? sphere.trim() : '';
    const categoryFilter = typeof category === 'string' ? category.trim() : '';

    let query = `SELECT * FROM sav_algorithms WHERE 1=1`;
    const params: any[] = [];

    if (searchTerm) {
      query += ` AND (name LIKE ? OR description LIKE ? OR sphere LIKE ?)`;
      params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
    }

    if (sphereFilter && sphereFilter !== 'Все') {
      query += ` AND sphere = ?`;
      params.push(sphereFilter);
    }

    if (categoryFilter && categoryFilter !== 'Все') {
      query += ` AND category = ?`;
      params.push(categoryFilter);
    }

    if (popular === 'true' || popular === '1') {
      query += ` AND is_popular = 1`;
    }

    query += ` ORDER BY sort_order ASC, name ASC`;

    const rows = await getAll(query, params);
    const items = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      sphere: r.sphere || 'Другое',
      category: r.category || 'Услуги',
      sortOrder: Number(r.sort_order) || 0,
      isPopular: r.is_popular === 1
    }));

    res.json({
      success: true,
      items,
      count: items.length
    });
  } catch (err: any) {
    console.error('Error fetching algorithms:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Get Marketplace Categories from marketplace_categories table with search support
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const { q, search } = req.query;
    const searchTerm = (typeof q === 'string' ? q : typeof search === 'string' ? search : '').trim();

    let sqlStr = `
      SELECT id, name, description, icon, sort_order
      FROM marketplace_categories
    `;
    const params: any[] = [];

    if (searchTerm) {
      sqlStr += ` WHERE name LIKE $1 OR description LIKE $2 `;
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }

    sqlStr += ` ORDER BY sort_order ASC, name ASC `;

    let categoriesList = await query(sqlStr, params);

    // Fallback: If marketplace_categories table is empty, get distinct from marketplace_products
    if (!categoriesList || categoriesList.length === 0) {
      let fallbackQuery = `SELECT DISTINCT category as name FROM marketplace_products WHERE category IS NOT NULL AND category != ''`;
      const fallbackParams: any[] = [];
      if (searchTerm) {
        fallbackQuery += ` AND category LIKE $1`;
        fallbackParams.push(`%${searchTerm}%`);
      }
      fallbackQuery += ` ORDER BY category ASC`;
      categoriesList = await query(fallbackQuery, fallbackParams);
    }

    const categories = ['Все', ...categoriesList.map((c: any) => c.name).filter(Boolean)];
    res.json({
      success: true,
      categories,
      items: categoriesList
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Save/Sync Parsed Products to BD ProTalk DB
router.post('/sync-products', (req: Request, res: Response) => {
  try {
    const { products, replace } = req.body;
    if (!Array.isArray(products)) {
      return res.status(400).json({ success: false, error: 'Array of products required' });
    }

    if (replace) {
      executeRun(`DELETE FROM marketplace_products`);
    }

    for (const p of products) {
      executeRun(`
        INSERT INTO marketplace_products (
          id, tilda_uid, sku, brand, name, category, niche,
          short_description, full_description, text_html, modifications_text,
          price, max_price, period, image_url, demo_url, url,
          seo_title, seo_descr, seo_keywords, fb_title, fb_descr,
          tabs, variants, features, integrations, is_popular, rating, sales_count, setup_time, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          tilda_uid = excluded.tilda_uid,
          sku = excluded.sku,
          brand = excluded.brand,
          name = excluded.name,
          category = excluded.category,
          niche = excluded.niche,
          short_description = excluded.short_description,
          full_description = excluded.full_description,
          text_html = excluded.text_html,
          modifications_text = excluded.modifications_text,
          price = excluded.price,
          max_price = excluded.max_price,
          period = excluded.period,
          image_url = excluded.image_url,
          demo_url = excluded.demo_url,
          url = excluded.url,
          seo_title = excluded.seo_title,
          seo_descr = excluded.seo_descr,
          seo_keywords = excluded.seo_keywords,
          fb_title = excluded.fb_title,
          fb_descr = excluded.fb_descr,
          tabs = excluded.tabs,
          variants = excluded.variants,
          features = excluded.features,
          integrations = excluded.integrations,
          is_popular = excluded.is_popular,
          rating = excluded.rating,
          sales_count = excluded.sales_count,
          setup_time = excluded.setup_time,
          updated_at = CURRENT_TIMESTAMP
      `, [
        p.id,
        p.tildaUid || p.id,
        p.sku || null,
        p.brand || 'SAV AI',
        p.name,
        p.category || 'SAV Торговля',
        p.niche || null,
        p.shortDescription || null,
        p.fullDescription || null,
        p.textHtml || null,
        p.modificationsText || null,
        p.price || 0,
        p.maxPrice || p.price || 0,
        p.period || 'руб',
        p.imageUrl || null,
        p.demoUrl || null,
        p.url || null,
        p.seoTitle || null,
        p.seoDescr || null,
        p.seoKeywords || null,
        p.fbTitle || null,
        p.fbDescr || null,
        JSON.stringify(p.tabs || []),
        JSON.stringify(p.variants || []),
        JSON.stringify(p.features || []),
        JSON.stringify(p.integrations || []),
        p.isPopular ? 1 : 0,
        p.rating || 4.9,
        p.salesCount || 0,
        p.setupTime || '2 часа'
      ]);
    }

    saveDb();
    res.json({ success: true, message: `Успешно синхронизировано ${products.length} товаров в базу данных BD ProTalk.` });
  } catch (err: any) {
    console.error('Error syncing products:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4.1 Bulk Delete Products from Marketplace Database
router.post('/bulk-delete', (req: Request, res: Response) => {
  try {
    const { ids, all } = req.body;

    if (all) {
      executeRun(`DELETE FROM marketplace_products`);
      saveDb();
      return res.json({ success: true, message: 'Все товары успешно удалены из каталога маркетплейса' });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Список ID для удаления обязателен' });
    }

    for (const id of ids) {
      executeRun(`DELETE FROM marketplace_products WHERE id = ? OR tilda_uid = ?`, [id, id]);
    }

    saveDb();
    res.json({ success: true, message: `Успешно удалено ${ids.length} товаров из базы данных` });
  } catch (err: any) {
    console.error('Error in bulk delete:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4.2 Reset Marketplace to Default Initial Items
router.post('/reset-default', (req: Request, res: Response) => {
  try {
    const { products } = req.body;

    executeRun(`DELETE FROM marketplace_products`);

    // Reset default categories
    executeRun(`DELETE FROM marketplace_categories`);
    const defaultCategories = [
      { id: 'cat_trade', name: 'SAV Торговля', description: 'ИИ-боты и консультанты для ритейла и интернет-магазинов', icon: 'ShoppingBag', sort_order: 1 },
      { id: 'cat_services', name: 'SAV Услуги', description: 'Интеллектуальные помощники для сферы услуг и записи клиентов', icon: 'Briefcase', sort_order: 2 },
      { id: 'cat_production', name: 'SAV Производство', description: 'Автоматизация приема заявок и расчетов для производств', icon: 'Factory', sort_order: 3 },
      { id: 'cat_b2b', name: 'SAV B2B и Опт', description: 'Решения для оптовых компаний и дистрибьюторов', icon: 'Building2', sort_order: 4 },
      { id: 'cat_agents', name: 'ИИ-Агенты', description: 'Автономные нейросетевые агенты с глубокой интеграцией', icon: 'Bot', sort_order: 5 }
    ];

    for (const c of defaultCategories) {
      executeRun(`
        INSERT INTO marketplace_categories (id, name, description, icon, sort_order)
        VALUES (?, ?, ?, ?, ?)
      `, [c.id, c.name, c.description, c.icon, c.sort_order]);
    }

    if (Array.isArray(products) && products.length > 0) {
      for (const p of products) {
        executeRun(`
          INSERT INTO marketplace_products (
            id, tilda_uid, sku, brand, name, category, niche,
            short_description, full_description, text_html, modifications_text,
            price, max_price, period, image_url, demo_url, url,
            seo_title, seo_descr, seo_keywords, fb_title, fb_descr,
            tabs, variants, features, integrations, is_popular, rating, sales_count, setup_time, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          p.id,
          p.tildaUid || p.id,
          p.sku || null,
          p.brand || 'SAV AI',
          p.name,
          p.category || 'SAV Торговля',
          p.niche || null,
          p.shortDescription || null,
          p.fullDescription || null,
          p.textHtml || null,
          p.modificationsText || null,
          p.price || 0,
          p.maxPrice || p.price || 0,
          p.period || 'руб',
          p.imageUrl || null,
          p.demoUrl || null,
          p.url || null,
          p.seoTitle || null,
          p.seoDescr || null,
          p.seoKeywords || null,
          p.fbTitle || null,
          p.fbDescr || null,
          JSON.stringify(p.tabs || []),
          JSON.stringify(p.variants || []),
          JSON.stringify(p.features || []),
          JSON.stringify(p.integrations || []),
          p.isPopular ? 1 : 0,
          p.rating || 4.9,
          p.salesCount || 0,
          p.setupTime || '2 часа'
        ]);
      }
    }

    saveDb();
    res.json({ success: true, message: 'Каталог маркетплейса успешно возвращен к базовым настройкам и зафиксирован в BD ProTalk' });
  } catch (err: any) {
    console.error('Error resetting marketplace:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4.3 Direct Import from Google Sheets URL
router.post('/import-google-sheets', async (req: Request, res: Response) => {
  try {
    const { url, replace = true } = req.body;
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ success: false, error: 'Укажите ссылку на Google Таблицу' });
    }

    let exportUrl = url.trim();
    const sheetIdMatch = exportUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (sheetIdMatch && sheetIdMatch[1]) {
      const sheetId = sheetIdMatch[1];
      // Check if gid is present
      const gidMatch = exportUrl.match(/[#&?]gid=([0-9]+)/);
      const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
      exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidParam}`;
    }

    const csvText = await fetchUrlText(exportUrl);
    if (!csvText || !csvText.trim()) {
      return res.status(400).json({ success: false, error: 'Не удалось получить данные из указанной Google Таблицы. Убедитесь, что таблица доступна по ссылке.' });
    }



    const allRows = parseCsvRows(csvText);
    if (allRows.length <= 1) {
      return res.status(400).json({ success: false, error: 'В таблице не найдено строк данных.' });
    }

    const headers = allRows[0].map(h => h.toLowerCase().trim());
    const getColIndex = (regex: RegExp): number => headers.findIndex(h => regex.test(h));

    const uidIdx = getColIndex(/^tilda\s*uid/i);
    const parentUidIdx = getColIndex(/^parent\s*uid/i);
    const brandIdx = getColIndex(/^brand/i);
    const skuIdx = getColIndex(/^sku/i);
    const catIdx = getColIndex(/^category/i);
    const titleIdx = getColIndex(/^title|^name|^название/i);
    const descIdx = getColIndex(/^description|^описание/i);
    const textIdx = getColIndex(/^text|^текст|^html/i);
    const photoIdx = getColIndex(/^photo|^image|^фото|^картинка/i);
    const priceIdx = getColIndex(/^price$|^цена$/i);
    const oldPriceIdx = getColIndex(/^price\s*old|^старая\s*цена/i);
    const editionsIdx = getColIndex(/^editions|^модификац/i);
    const modTextIdx = getColIndex(/^modifications|^опции/i);
    const externalIdIdx = getColIndex(/^external\s*id|^внешний/i);
    const lengthIdx = getColIndex(/^length/i);
    const seoTitleIdx = getColIndex(/^seo\s*title/i);
    const seoDescrIdx = getColIndex(/^seo\s*descr/i);
    const seoKeywordsIdx = getColIndex(/^seo\s*keywords/i);
    const fbTitleIdx = getColIndex(/^fb\s*title/i);
    const fbDescrIdx = getColIndex(/^fb\s*descr/i);
    const urlIdx = getColIndex(/^url|^ссылка/i);

    const tabCols: { idx: number; name: string }[] = [];
    allRows[0].forEach((h, idx) => {
      if (/^tabs?:/i.test(h) || /^вкладка/i.test(h) || /^таб:/i.test(h)) {
        const cleanName = h.replace(/^tabs?:\s*|^вкладка\s*|^таб:\s*/i, '').trim();
        tabCols.push({ idx, name: cleanName });
      }
    });

    const itemsMap = new Map<string, any>();
    let currentParent: any = null;

    for (let i = 1; i < allRows.length; i++) {
      const row = allRows[i];
      if (!row || row.every(cell => !cell || !cell.trim())) continue;

      const getVal = (idx: number): string => (idx >= 0 && row[idx] ? row[idx].trim() : '');

      const uid = getVal(uidIdx);
      const parentUid = getVal(parentUidIdx);
      const brand = getVal(brandIdx);
      const sku = getVal(skuIdx);
      const category = getVal(catIdx);
      const title = getVal(titleIdx);
      const desc = getVal(descIdx);
      const textHtml = getVal(textIdx);
      const photo = getVal(photoIdx);
      const priceStr = getVal(priceIdx).replace(/[^\d.]/g, '');
      const price = parseFloat(priceStr) || 0;
      const oldPriceStr = getVal(oldPriceIdx).replace(/[^\d.]/g, '');
      const oldPrice = oldPriceStr ? parseFloat(oldPriceStr) : undefined;
      const editions = getVal(editionsIdx);
      const modText = getVal(modTextIdx);
      const externalId = getVal(externalIdIdx);
      const lengthVal = getVal(lengthIdx);
      const seoTitle = getVal(seoTitleIdx);
      const seoDescr = getVal(seoDescrIdx);
      const seoKeywords = getVal(seoKeywordsIdx);
      const fbTitle = getVal(fbTitleIdx);
      const fbDescr = getVal(fbDescrIdx);
      const rowUrl = getVal(urlIdx);

      const hasTariffInEditions = /тариф:/i.test(editions);
      const hasParentNamePrefix = currentParent && title && title.toLowerCase().startsWith(currentParent.name.toLowerCase() + ' - ');
      const isChildVariantRow = Boolean(
        currentParent && (
          hasTariffInEditions ||
          hasParentNamePrefix ||
          (!category && (price > 0 || sku)) ||
          (lengthVal && currentParent.tildaUid && lengthVal === currentParent.tildaUid) ||
          (parentUid && currentParent.tildaUid && parentUid === currentParent.tildaUid)
        )
      );

      if (!isChildVariantRow) {
        // Parent Product
        const cleanDesc = (desc || '').replace(/<[^>]*>?/gm, '').trim();
        const mainTitle = title || `ИИ-Решение ${i}`;
        const itemId = uid || sku || `item-${i}-${Date.now()}`;

        const tabs: any[] = [];
        tabCols.forEach(({ idx, name }) => {
          const tabRaw = row[idx];
          if (tabRaw && tabRaw.trim() && !tabRaw.includes('=+')) {
            let defaultTabName = 'Описание';
            if (name === '1' || name.toLowerCase().includes('тариф')) defaultTabName = 'Тарифы и возможности';
            else if (name === '2' || name.toLowerCase().includes('описан')) defaultTabName = 'Описание и функционал';
            else if (name === '3' || name.toLowerCase().includes('опци')) defaultTabName = 'Опции и интеграции';
            else if (name) defaultTabName = name;

            const sanitized = sanitizeTabString(tabRaw, defaultTabName);
            if (sanitized.content) {
              tabs.push(sanitized);
            }
          }
        });

        if (tabs.length === 0) {
          tabs.push(
            { title: 'Тарифы и возможности', content: textHtml || 'Выберите подходящий тариф: Лайт, Эконом, Стандарт, Премиум или VIP.' },
            { title: 'Описание и функционал', content: cleanDesc || 'Готовый интеллектуальный консультант для автоматизации продаж и обслуживания клиентов 24/7.' },
            { title: 'Опции и интеграции', content: 'Токены можно докупать:<br />1. 10 млн. токенов = 600 руб.<br />2. 50 млн. токенов = 3 000 руб.<br />3. 200 млн. токенов = 12 000 руб.<br />4. 400 млн. токенов = 24 000 руб.<br /><br />Токены к концу месяца не сгорают и переносятся на следующий месяц при оплате тарифа.<br /><br />Подключение: Telegram, WhatsApp, Чат на сайт, ВКонтакте, CRM (amoCRM, Битрикс24).' }
          );
        }

        const newItem = {
          id: itemId,
          tildaUid: uid || itemId,
          sku: sku || undefined,
          brand: brand || 'SAV AI',
          name: mainTitle,
          category: category || 'SAV Торговля',
          niche: desc || 'Автоматизация продаж и консультации 24/7',
          shortDescription: cleanDesc.slice(0, 160) + (cleanDesc.length > 160 ? '...' : ''),
          fullDescription: cleanDesc || 'Готовый интеллектуальный консультант для вашего бизнеса.',
          textHtml: textHtml || undefined,
          modificationsText: modText || undefined,
          price: price || 3600,
          maxPrice: 57600,
          period: 'руб',
          imageUrl: photo || 'https://static.tildacdn.com/stor3230-3239-4336-a663-646662353539/91136143.png',
          demoUrl: 'https://t.me/SAVPartnerBot',
          url: rowUrl || undefined,
          seoTitle: seoTitle || `${mainTitle} — Готовое решение для продаж | SAV AI`,
          seoDescr: seoDescr || cleanDesc.slice(0, 160),
          seoKeywords: seoKeywords || undefined,
          fbTitle: fbTitle || undefined,
          fbDescr: fbDescr || undefined,
          features: [
            'Круглосуточная консультация клиентов 24/7',
            'Индивидуальная адаптация под ваш ассортимент',
            'Быстрая интеграция с CRM и мессенджерами',
            'Работа со сложными возражениями и расчет цен'
          ],
          integrations: ['Telegram', 'WhatsApp', 'Чат на сайт', 'amoCRM', 'Битрикс24'],
          isPopular: true,
          rating: 4.9,
          salesCount: 120,
          setupTime: '2 часа',
          tabs,
          variants: []
        };

        itemsMap.set(itemId, newItem);
        currentParent = newItem;
      } else if (currentParent) {
        // Child Package Variant
        let tariffName = '';
        let categoryOption = '';
        let segmentOption = '';
        const extraTags: string[] = [];

        if (editions) {
          const parts = editions.split(';').map(s => s.trim()).filter(Boolean);
          parts.forEach(p => {
            const [k, v] = p.split(':').map(s => s.trim());
            if (k && v) {
              const kLower = k.toLowerCase();
              if (kLower === 'тариф') tariffName = v;
              else if (kLower === 'категория') { categoryOption = v; extraTags.push(v); }
              else if (kLower === 'сегмент') { segmentOption = v; extraTags.push(v); }
              else extraTags.push(`${k}: ${v}`);
            }
          });
        }

        if (!tariffName && title) {
          const tMatch = title.match(/(Лайт|Эконом|Стандарт|Премиум|VIP|Базовый|Продвинутый|Максимальный)/i);
          tariffName = tMatch ? tMatch[1] : (title.split(' - ')[1] || title);
        }

        const directUrl = (rowUrl && rowUrl.startsWith('http')) ? rowUrl : getVal(27);
        const variantName = tariffName ? `Тариф: ${tariffName}` : (title || `Вариант ${(currentParent.variants?.length || 0) + 1}`);
        const variantSubtitle = extraTags.length > 0 ? extraTags.join(' • ') : (editions || undefined);
        const variantPrice = price || currentParent.price || 3600;
        const variantOldPrice = oldPrice || (variantPrice ? variantPrice * 5 : 18000);

        const variantObj = {
          id: uid || sku || `var-${currentParent.id}-${(currentParent.variants?.length || 0) + 1}`,
          tildaUid: uid,
          parentUid: parentUid || currentParent.tildaUid || currentParent.id,
          sku: sku || undefined,
          tariff: tariffName || undefined,
          categoryOption: categoryOption || undefined,
          segmentOption: segmentOption || undefined,
          name: variantName,
          subtitle: variantSubtitle,
          price: variantPrice,
          oldPrice: variantOldPrice,
          editions: editions || undefined,
          imageUrl: photo || currentParent.imageUrl,
          url: directUrl || undefined
        };

        if (!currentParent.variants) currentParent.variants = [];
        currentParent.variants.push(variantObj);

        const prices = currentParent.variants.map((v: any) => v.price).filter((p: number) => p > 0);
        if (prices.length > 0) {
          currentParent.price = Math.min(...prices);
          currentParent.maxPrice = Math.max(...prices);
        }
      }
    }

    const parsedProducts = Array.from(itemsMap.values());

    if (replace) {
      executeRun(`DELETE FROM marketplace_products`);
    }

    let totalVariantsCount = 0;
    for (const p of parsedProducts) {
      totalVariantsCount += (p.variants?.length || 0);
      executeRun(`
        INSERT INTO marketplace_products (
          id, tilda_uid, sku, brand, name, category, niche,
          short_description, full_description, text_html, modifications_text,
          price, max_price, period, image_url, demo_url, url,
          seo_title, seo_descr, seo_keywords, fb_title, fb_descr,
          tabs, variants, features, integrations, is_popular, rating, sales_count, setup_time, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          tilda_uid = excluded.tilda_uid,
          sku = excluded.sku,
          brand = excluded.brand,
          name = excluded.name,
          category = excluded.category,
          niche = excluded.niche,
          short_description = excluded.short_description,
          full_description = excluded.full_description,
          text_html = excluded.text_html,
          modifications_text = excluded.modifications_text,
          price = excluded.price,
          max_price = excluded.max_price,
          period = excluded.period,
          image_url = excluded.image_url,
          demo_url = excluded.demo_url,
          url = excluded.url,
          seo_title = excluded.seo_title,
          seo_descr = excluded.seo_descr,
          seo_keywords = excluded.seo_keywords,
          fb_title = excluded.fb_title,
          fb_descr = excluded.fb_descr,
          tabs = excluded.tabs,
          variants = excluded.variants,
          features = excluded.features,
          integrations = excluded.integrations,
          is_popular = excluded.is_popular,
          rating = excluded.rating,
          sales_count = excluded.sales_count,
          setup_time = excluded.setup_time,
          updated_at = CURRENT_TIMESTAMP
      `, [
        p.id,
        p.tildaUid || p.id,
        p.sku || null,
        p.brand || 'SAV AI',
        p.name,
        p.category || 'SAV Торговля',
        p.niche || null,
        p.shortDescription || null,
        p.fullDescription || null,
        p.textHtml || null,
        p.modificationsText || null,
        p.price || 0,
        p.maxPrice || p.price || 0,
        p.period || 'руб',
        p.imageUrl || null,
        p.demoUrl || null,
        p.url || null,
        p.seoTitle || null,
        p.seoDescr || null,
        p.seoKeywords || null,
        p.fbTitle || null,
        p.fbDescr || null,
        JSON.stringify(p.tabs || []),
        JSON.stringify(p.variants || []),
        JSON.stringify(p.features || []),
        JSON.stringify(p.integrations || []),
        p.isPopular ? 1 : 0,
        p.rating || 4.9,
        p.salesCount || 0,
        p.setupTime || '2 часа'
      ]);
    }

    saveDb();

    res.json({
      success: true,
      count: parsedProducts.length,
      totalVariants: totalVariantsCount,
      message: `Успешно импортировано ${parsedProducts.length} продуктов (и ${totalVariantsCount} пакетов-тарифов) из Google Таблицы в базу данных BD ProTalk.`
    });
  } catch (err: any) {
    console.error('Error importing from Google Sheets:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4.1. Fetch Raw Sheet CSV for client-side progressive batch processing
router.post('/fetch-sheet-csv', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL Google Таблицы обязателен' });
    }

    let downloadUrl = url.trim();
    if (downloadUrl.includes('docs.google.com/spreadsheets')) {
      const match = downloadUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        const sheetId = match[1];
        let gid = '0';
        const gidMatch = downloadUrl.match(/gid=([0-9]+)/);
        if (gidMatch && gidMatch[1]) gid = gidMatch[1];
        downloadUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      }
    }

    const csvText = await fetchUrlText(downloadUrl);
    if (!csvText || csvText.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Получен пустой ответ от Google Таблицы' });
    }

    res.json({ success: true, csvText, length: csvText.length });
  } catch (err: any) {
    console.error('Error fetching sheet CSV:', err);
    res.status(500).json({ success: false, error: err.message || 'Ошибка загрузки Google Таблицы' });
  }
});

// 4.2. Progressive Batch Sync - Saves a single batch of products and variants with live progress
router.post('/sync-batch', async (req: Request, res: Response) => {
  try {
    const { items, batchIndex = 0, totalBatches = 1, replace = false } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'Items array is required' });
    }

    // If replace is true and it is the very first batch, clean the products table
    if (replace && batchIndex === 0) {
      await runSql(`DELETE FROM marketplace_products`);
    }

    let batchVariantsCount = 0;

    for (const p of items) {
      batchVariantsCount += (p.variants?.length || 0);

      // Clean tabs if needed
      const cleanTabs = (p.tabs || []).map((t: any) => {
        const sanitized = sanitizeTabString(t.content, t.title || 'Описание');
        return {
          title: sanitized.title,
          content: sanitized.content
        };
      });

      await runSql(`
        INSERT INTO marketplace_products (
          id, tilda_uid, sku, brand, name, category, niche,
          short_description, full_description, text_html, modifications_text,
          price, max_price, period, image_url, demo_url, url,
          seo_title, seo_descr, seo_keywords, fb_title, fb_descr,
          tabs, variants, features, integrations, is_popular, rating, sales_count, setup_time, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          tilda_uid = excluded.tilda_uid,
          sku = excluded.sku,
          brand = excluded.brand,
          name = excluded.name,
          category = excluded.category,
          niche = excluded.niche,
          short_description = excluded.short_description,
          full_description = excluded.full_description,
          text_html = excluded.text_html,
          modifications_text = excluded.modifications_text,
          price = excluded.price,
          max_price = excluded.max_price,
          period = excluded.period,
          image_url = excluded.image_url,
          demo_url = excluded.demo_url,
          url = excluded.url,
          seo_title = excluded.seo_title,
          seo_descr = excluded.seo_descr,
          seo_keywords = excluded.seo_keywords,
          fb_title = excluded.fb_title,
          fb_descr = excluded.fb_descr,
          tabs = excluded.tabs,
          variants = excluded.variants,
          features = excluded.features,
          integrations = excluded.integrations,
          is_popular = excluded.is_popular,
          rating = excluded.rating,
          sales_count = excluded.sales_count,
          setup_time = excluded.setup_time,
          updated_at = CURRENT_TIMESTAMP
      `, [
        p.id,
        p.tildaUid || p.id,
        p.sku || null,
        p.brand || 'SAV AI',
        p.name,
        p.category || 'SAV Торговля',
        p.niche || null,
        p.shortDescription || null,
        p.fullDescription || null,
        p.textHtml || null,
        p.modificationsText || null,
        p.price || 0,
        p.maxPrice || p.price || 0,
        p.period || 'руб',
        p.imageUrl || null,
        p.demoUrl || null,
        p.url || null,
        p.seoTitle || null,
        p.seoDescr || null,
        p.seoKeywords || null,
        p.fbTitle || null,
        p.fbDescr || null,
        JSON.stringify(cleanTabs),
        JSON.stringify(p.variants || []),
        JSON.stringify(p.features || []),
        JSON.stringify(p.integrations || []),
        p.isPopular ? 1 : 0,
        p.rating || 4.9,
        p.salesCount || 0,
        p.setupTime || '2 часа'
      ]);
    }

    const countRows = await query(`SELECT COUNT(*) as total FROM marketplace_products`);
    const totalInDb = countRows[0]?.total || 0;

    res.json({
      success: true,
      processed: items.length,
      variantsProcessed: batchVariantsCount,
      batchIndex,
      totalBatches,
      totalInDb,
      message: `Пакет ${batchIndex + 1} из ${totalBatches} успешно сохранен (${items.length} продуктов)`
    });
  } catch (err: any) {
    console.error('Error syncing batch:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Submit Marketplace Consultation / Order Lead
router.post('/leads', async (req: Request, res: Response) => {
  try {
    const { itemId, itemName, variantName, price, customerName, contact, company, messenger, comment } = req.body;
    if (!contact) {
      return res.status(400).json({ success: false, error: 'Contact phone/telegram is required' });
    }

    const leadId = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await runSql(`
      INSERT INTO marketplace_leads (id, item_id, item_name, variant_name, price, customer_name, contact, company, messenger, comment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [leadId, itemId || null, itemName || null, variantName || null, price || 0, customerName || null, contact, company || null, messenger || 'telegram', comment || null]);

    res.json({ success: true, message: 'Lead saved successfully', leadId });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
