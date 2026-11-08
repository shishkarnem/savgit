import { MarketplaceItem, ProductVariant, ProductTab } from '@/types';
export { parseCsvContent, parseTabCell } from '@/data/marketplaceData';

/**
 * Escapes a cell value for standard RFC 4180 CSV
 */
function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (
    stringValue.includes(',') ||
    stringValue.includes(';') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r') ||
    stringValue.includes('"')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Exports products array into full standard Tilda / SAV AI CSV format
 */
export function exportProductsToCsv(products: any[]): string {
  const headers = [
    'Tilda UID',
    'Parent UID',
    'Brand',
    'SKU',
    'Category',
    'Title',
    'Description',
    'Text',
    'Photo',
    'Price',
    'Price Old',
    'Editions',
    'Modifications',
    'External ID',
    'SEO Title',
    'SEO Description',
    'SEO Keywords',
    'FB Title',
    'FB Description',
    'URL',
    'Tab:Тарифы',
    'Tab:Описание',
    'Tab:Опции'
  ];

  const rows: string[][] = [headers];

  products.forEach((p) => {
    const parentUid = p.tilda_uid || p.tildaUid || p.id || '';
    const brand = p.brand || 'SAV AI';
    const sku = p.sku || '';
    const category = p.category || 'SAV Торговля';
    const title = p.name || '';
    const desc = p.short_description || p.shortDescription || p.niche || '';
    const text = p.text_html || p.textHtml || p.full_description || p.fullDescription || '';
    const photo = p.image_url || p.imageUrl || '';
    const price = p.price || 0;
    const maxPrice = p.max_price || p.maxPrice || 0;
    const modText = p.modifications_text || p.modificationsText || '';
    const extId = p.id || '';
    const seoTitle = p.seo_title || p.seoTitle || '';
    const seoDescr = p.seo_descr || p.seoDescr || '';
    const seoKeywords = p.seo_keywords || p.seoKeywords || '';
    const fbTitle = p.fb_title || p.fbTitle || '';
    const fbDescr = p.fb_descr || p.fbDescr || '';
    const url = p.url || '';

    // Parse tabs
    let tabsArr: ProductTab[] = [];
    if (typeof p.tabs === 'string') {
      try {
        tabsArr = JSON.parse(p.tabs);
      } catch (_) {
        tabsArr = [];
      }
    } else if (Array.isArray(p.tabs)) {
      tabsArr = p.tabs;
    }

    const tabTariffs = tabsArr.find((t) => t.title?.toLowerCase().includes('тариф'))?.content || '';
    const tabDesc = tabsArr.find((t) => t.title?.toLowerCase().includes('описан'))?.content || '';
    const tabOptions = tabsArr.find((t) => t.title?.toLowerCase().includes('опци'))?.content || '';

    // 1. Parent Row
    rows.push([
      parentUid,
      '', // Parent UID is empty for main product
      brand,
      sku,
      category,
      title,
      desc,
      text,
      photo,
      String(price),
      maxPrice > price ? String(maxPrice) : '',
      '',
      modText,
      extId,
      seoTitle,
      seoDescr,
      seoKeywords,
      fbTitle,
      fbDescr,
      url,
      tabTariffs ? `Тарифы:${tabTariffs}` : '',
      tabDesc ? `Описание:${tabDesc}` : '',
      tabOptions ? `Опции:${tabOptions}` : ''
    ]);

    // 2. Variants Rows
    let variantsArr: ProductVariant[] = [];
    if (typeof p.variants === 'string') {
      try {
        variantsArr = JSON.parse(p.variants);
      } catch (_) {
        variantsArr = [];
      }
    } else if (Array.isArray(p.variants)) {
      variantsArr = p.variants;
    }

    variantsArr.forEach((v) => {
      const vUid = v.tildaUid || v.id || `var_${parentUid}_${Math.random().toString(36).substring(2, 6)}`;
      const vSku = v.sku || '';
      const vTitle = v.name ? `${title} - ${v.name.replace(/^Тариф:\s*/i, '')}` : `${title} - Вариант`;
      const vEditions = v.editions || (v.tariff ? `Тариф:${v.tariff}` : '');
      const vPrice = v.price || price;
      const vOldPrice = v.oldPrice || '';
      const vPhoto = v.imageUrl || photo;

      rows.push([
        vUid,
        parentUid, // Links to parent UID
        brand,
        vSku,
        category,
        vTitle,
        '',
        '',
        vPhoto,
        String(vPrice),
        vOldPrice ? String(vOldPrice) : '',
        vEditions,
        '',
        vUid,
        '',
        '',
        '',
        '',
        '',
        v.url || '',
        '',
        '',
        ''
      ]);
    });
  });

  const csvLines = rows.map((row) => row.map(escapeCsvCell).join(';'));
  return '\uFEFF' + csvLines.join('\r\n');
}

/**
 * Generates a clean sample CSV template with standard columns and examples
 */
export function generateSampleCsvTemplate(): string {
  const sampleProducts = [
    {
      id: '840361468312',
      tildaUid: '840361468312',
      sku: 'SAV-SHOES-01',
      brand: 'SAV AI',
      name: 'ИИ Продавец Обуви',
      category: 'SAV Торговля',
      shortDescription: 'Автоматизируйте продажи обуви с ИИ-ботом: консультации, подбор моделей, обработка заявок 24/7.',
      fullDescription: 'Универсальный цифровой консультант для магазинов обуви. Подбор размера по длине стопы и прием заказов.',
      price: 3600,
      maxPrice: 57600,
      imageUrl: 'https://static.tildacdn.com/stor3230-3239-4336-a663-646662353539/91136143.png',
      url: 'http://savbot.ru/tproduct/840361468312-ii-prodavets-obuvi',
      seoTitle: 'ИИ Продавец Обуви — Автоматизация продаж в ритейле | SAV AI',
      seoDescr: 'Готовый интеллектуальный консультант для обувных магазинов.',
      seoKeywords: 'ии продавец обуви, бот для обувного магазина',
      tabs: [
        { title: 'Тарифы', content: '<strong>Тариф Лайт</strong>: 3 600 руб/мес<br /><strong>Тариф Стандарт</strong>: 14 400 руб/мес' },
        { title: 'Описание', content: 'Консультации, подбор размера, оформление заявок 24/7.' }
      ],
      variants: [
        { id: 'var_shoes_1', tildaUid: 'var_shoes_1', sku: '20001', name: 'Тариф: Лайт', tariff: 'Лайт', price: 3600, editions: 'Тариф:Лайт;Категория:Товары;Сегмент:B2C' },
        { id: 'var_shoes_2', tildaUid: 'var_shoes_2', sku: '20003', name: 'Тариф: Стандарт', tariff: 'Стандарт', price: 14400, editions: 'Тариф:Стандарт;Категория:Товары;Сегмент:B2C' }
      ]
    },
    {
      id: '796673995232',
      tildaUid: '796673995232',
      sku: 'SAV-CLOTHES-01',
      brand: 'SAV AI',
      name: 'ИИ Продавец Одежды',
      category: 'SAV Торговля',
      shortDescription: 'Автоматизируйте продажи одежды: умный подбор образов, размеров по параметрам и оформление заказов 24/7.',
      fullDescription: 'Интеллектуальный помощник для магазинов одежды и брендов. Круглосуточно консультирует покупателей.',
      price: 3600,
      maxPrice: 57600,
      imageUrl: 'https://static.tildacdn.com/stor3661-3033-4264-a163-313239356439/34914426.png',
      url: 'http://savbot.ru/tproduct/796673995232-ii-prodavets-odezhdi',
      seoTitle: 'ИИ Продавец Одежды — Умный консультант | SAV AI',
      seoDescr: 'Автоматизация продаж одежды с помощью ИИ 24/7.',
      seoKeywords: 'ии продавец одежды, бот для магазина одежды',
      tabs: [
        { title: 'Тарифы', content: '<strong>Тариф Лайт</strong>: 3 600 руб/мес<br /><strong>Тариф Премиум</strong>: 28 800 руб/мес' }
      ],
      variants: [
        { id: 'var_cloth_1', tildaUid: 'var_cloth_1', sku: '30001', name: 'Тариф: Лайт', tariff: 'Лайт', price: 3600, editions: 'Тариф:Лайт;Категория:Товары;Сегмент:B2C' }
      ]
    }
  ];

  return exportProductsToCsv(sampleProducts);
}

/**
 * Triggers client-side browser download for a CSV string
 */
export function downloadCsvBlob(csvContent: string, filename: string = 'sav_marketplace_products.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
