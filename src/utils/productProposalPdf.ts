import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { MarketplaceItem, ProductVariant } from '@/types';
import { getSavAiLogoDataUrl, OFFICIAL_LOGO_URL, FALLBACK_REMOTE_LOGO_URL } from './pdfLogoHelper';

export const PROTALK_LOGO_URL = OFFICIAL_LOGO_URL;

// Standard tariff capability definitions based on specification
const TARIFF_SPECS: Record<string, { devCost: number; tokenCount: string; msgs: string; dialogs: string; channels: string; features: string[] }> = {
  'лайт': {
    devCost: 18000,
    tokenCount: '10 млн токенов (~500 - 5 000 сообщений)',
    msgs: '500 сообщений',
    dialogs: '50 диалогов',
    channels: 'Telegram бот или Чат на сайте на выбор',
    features: [
      'Консультация клиентов по базе знаний компании',
      'Расчет стоимости товаров и услуг по прайс-листу',
      'Отправка заявок и контактов клиентов в Telegram или Google Таблицу',
      'Отработка частых вопросов и базовых возражений клиентов',
      'Лимит: 10 млн токенов (хватает до 5 000 сообщений, 50 диалогов в месяц)'
    ]
  },
  'эконом': {
    devCost: 36000,
    tokenCount: '20 млн токенов (~1 000 - 10 000 сообщений)',
    msgs: '1000 сообщений',
    dialogs: '100 диалогов',
    channels: '3 мессенджера на выбор (Telegram, WhatsApp, Чат на сайте)',
    features: [
      'Консультация по расширенной базе знаний + встроенный скрипт продаж',
      'Расчет цены по калькулятору и сложному прайс-листу',
      'Отправка лидов в Telegram и Google Таблицы с уведомлением менеджера',
      'Отработка сложных возражений и дожим клиентов до сделки',
      'Автоматическая отправка коммерческих предложений и файлов',
      'Лимит: 20 млн токенов (хватает до 10 000 сообщений, 100 диалогов в месяц)'
    ]
  },
  'стандарт': {
    devCost: 72000,
    tokenCount: '50 млн токенов (~2 500 - 25 000 сообщений)',
    msgs: '2500 сообщений',
    dialogs: '250 диалогов',
    channels: 'Любое количество каналов связи без ограничений',
    features: [
      'База знаний любого объема (каталоги, регламенты, инструкции)',
      'Индивидуальный калькулятор параметров и конфигуратор заказа',
      'Двусторонняя интеграция с CRM (amoCRM, Битрикс24), Telegram, чатом и таблицами',
      'Автоматическое формирование договоров, счетов и коммерческих предложений',
      'Любое количество мессенджеров и соцсетей',
      'Лимит: 50 млн токенов (хватает до 25 000 сообщений, 250 диалогов в месяц)'
    ]
  },
  'премиум': {
    devCost: 144000,
    tokenCount: '200 млн токенов (~10 000 - 100 000 сообщений)',
    msgs: '10000 сообщений',
    dialogs: '1000 диалогов',
    channels: 'Все каналы + омниканальный контур + авто-напоминания',
    features: [
      'Несколько баз знаний под разные филиалы, отделы и линейки продуктов',
      'Полная интеграция в CRM-систему с переводом на ответственного менеджера',
      'Система автоматических напоминаний и прогрева клиентов по расписанию',
      'Глубокая аналитика диалогов и конверсий с формированием отчетов',
      'Лимит: 200 млн токенов (хватает до 100 000 сообщений, 1000 диалогов в месяц)'
    ]
  },
  'vip': {
    devCost: 288000,
    tokenCount: '400 млн токенов (~20 000 - 200 000 сообщений)',
    msgs: '20000 сообщений',
    dialogs: '2000 диалогов',
    channels: 'Мультиагентный контур + API сторонних сервисов',
    features: [
      'Думающие LLM модели + автономные ИИ-агенты с цепочками рассуждений',
      'Прямая интеграция по API со сторонними сервисами, 1С, складскими базами и ERP',
      'Индивидуальная кастомизация логики и сценариев под любые бизнес-процессы',
      'Персональный архитектор решений и приоритетная поддержка 24/7',
      'Лимит: 400 млн токенов (хватает до 200 000 сообщений, 2000 диалогов в месяц)'
    ]
  }
};

const DEFAULT_TARIFF_PRICES: Record<string, { monthly: number; onetime: number }> = {
  'лайт': { monthly: 3600, onetime: 18000 },
  'эконом': { monthly: 7200, onetime: 36000 },
  'стандарт': { monthly: 14400, onetime: 72000 },
  'премиум': { monthly: 28800, onetime: 144000 },
  'vip': { monthly: 57600, onetime: 288000 }
};

export interface ProductProposalOptions {
  product: MarketplaceItem;
  selectedVariant?: ProductVariant | null;
  descriptionHtml?: string;
  onProgress?: (progress: number, text: string) => void;
}

/**
 * Cleans text from raw HTML and promotional templates
 */
function cleanRawDescription(text: string): string {
  if (!text) return '';
  return text
    .replace(/^info\|#\|.*?\|#\|/gi, '')
    .replace(/info\|#\|/gi, '')
    .replace(/\|#\|/gi, '')
    .replace(/Материалы и видеообзор решения[\s\S]*?(?=<\/div>|$)/gi, '')
    .replace(/ТАРИФЫ ОТЛИЧАЮТСЯ ФУНКЦИОНАЛОМ[\s\S]*?(?=<\/div>|$)/gi, '')
    .replace(/Подробнее на вкладке Тарифы[\s\S]*?(?=<\/div>|$)/gi, '')
    .replace(/Вы можете подобрать любой удобный Тариф на выбор:[\s\S]*?(?=<\/div>|$)/gi, '')
    .replace(/Либо заказать БЕСПЛАТНЫЙ АУДИТ вашей текущей системы[\s\S]*?(?=<\/div>|$)/gi, '')
    .replace(/Консультация по ссылке[\s\S]*?(?=<\/div>|$)/gi, '')
    .replace(/Примеры ботов в плейлисте VK[\s\S]*?(?=<\/div>|$)/gi, '')
    .replace(/Примеры ботов в плейлисте YouTube[\s\S]*?(?=<\/div>|$)/gi, '')
    .trim();
}

/**
 * Splits description text/html into 2 or 3 coherent parts for PDF pages
 */
function splitDescriptionIntoParts(rawContent: string): {
  parts: string[][];
  partTitles: { tag: string; heading: string; subtitle: string }[];
} {
  const cleaned = cleanRawDescription(rawContent);
  if (!cleaned) {
    return {
      parts: [
        ['Интеллектуальная система автоматизации и обработки входящих обращений на базе передовых нейросетей.'],
        ['Обеспечивает интеграцию с CRM-системами, омниканальную работу в мессенджерах и автоматизацию ключевых воронок продаж.']
      ],
      partTitles: [
        {
          tag: 'ОПИСАНИЕ И АРХИТЕКТУРА РЕШЕНИЯ • ЧАСТЬ 1',
          heading: 'Подробное описание и бизнес-логика',
          subtitle: 'Архитектурные компоненты, сценарии взаимодействия и структура базы знаний'
        },
        {
          tag: 'ФУНКЦИОНАЛЬНЫЕ ВОЗМОЖНОСТИ • ЧАСТЬ 2',
          heading: 'Интеграционные шлюзы и автоматизация',
          subtitle: 'Каналы коммуникации, передача данных в CRM и протоколы безопасности'
        }
      ]
    };
  }

  // Convert HTML linebreaks to newlines and extract clean paragraphs
  const strippedText = cleaned
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n### $1\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '\n• $1\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<div[^>]*>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '') // remove remaining HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&laquo;|&raquo;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');

  // Split into raw blocks (paragraphs / bullet items)
  const rawBlocks = strippedText
    .split(/\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !/^[-—_]{3,}$/.test(s));

  if (rawBlocks.length <= 1) {
    const single = rawBlocks[0] || cleaned;
    const midIndex = Math.floor(single.length / 2);
    let splitPos = single.indexOf('. ', midIndex);
    if (splitPos === -1) splitPos = single.indexOf(' ', midIndex);
    if (splitPos === -1) splitPos = midIndex;
    else splitPos += 1;

    return {
      parts: [
        [single.slice(0, splitPos).trim()],
        [single.slice(splitPos).trim()]
      ],
      partTitles: [
        {
          tag: 'ОПИСАНИЕ И АРХИТЕКТУРА РЕШЕНИЯ • ЧАСТЬ 1',
          heading: 'Подробное описание и бизнес-логика',
          subtitle: 'Архитектурные компоненты, сценарии взаимодействия и структура базы знаний'
        },
        {
          tag: 'ФУНКЦИОНАЛЬНЫЕ ВОЗМОЖНОСТИ • ЧАСТЬ 2',
          heading: 'Интеграционные шлюзы и автоматизация',
          subtitle: 'Каналы коммуникации, передача данных в CRM и протоколы безопасности'
        }
      ]
    };
  }

  const totalLength = rawBlocks.reduce((acc, b) => acc + b.length, 0);

  // Divide into 3 parts if text is long to ensure compact, uncropped layout
  if (totalLength > 850 || rawBlocks.length >= 6) {
    const targetThird = totalLength / 3;
    const p1: string[] = [];
    const p2: string[] = [];
    const p3: string[] = [];
    let currentLen = 0;

    for (const block of rawBlocks) {
      if (currentLen < targetThird || p1.length === 0) {
        p1.push(block);
      } else if (currentLen < targetThird * 2 || p2.length === 0) {
        p2.push(block);
      } else {
        p3.push(block);
      }
      currentLen += block.length;
    }

    if (p3.length === 0 && p2.length > 1) {
      p3.push(p2.pop()!);
    }

    return {
      parts: [p1, p2, p3],
      partTitles: [
        {
          tag: 'ОПИСАНИЕ И АРХИТЕКТУРА РЕШЕНИЯ • ЧАСТЬ 1',
          heading: 'Подробное описание и бизнес-логика',
          subtitle: 'Архитектурные компоненты, сценарии взаимодействия и структура базы знаний'
        },
        {
          tag: 'ФУНКЦИОНАЛЬНЫЕ ВОЗМОЖНОСТИ • ЧАСТЬ 2',
          heading: 'Функциональные возможности системы',
          subtitle: 'Квалификация клиентов, обработка возражений и скрипты ведения диалога'
        },
        {
          tag: 'ИНТЕГРАЦИИ И КАНАЛЫ СВЯЗИ • ЧАСТЬ 3',
          heading: 'Интеграционные шлюзы и автоматизация',
          subtitle: 'Каналы коммуникации, передача данных в CRM и протоколы безопасности'
        }
      ]
    };
  }

  // 2 Parts distribution
  const targetHalf = totalLength / 2;
  const p1: string[] = [];
  const p2: string[] = [];
  let currentLen = 0;

  for (const block of rawBlocks) {
    if (currentLen < targetHalf || p1.length === 0) {
      p1.push(block);
    } else {
      p2.push(block);
    }
    currentLen += block.length;
  }

  if (p2.length === 0 && p1.length > 1) {
    p2.push(p1.pop()!);
  }

  return {
    parts: [p1, p2],
    partTitles: [
      {
        tag: 'ОПИСАНИЕ И АРХИТЕКТУРА РЕШЕНИЯ • ЧАСТЬ 1',
        heading: 'Подробное описание и бизнес-логика',
        subtitle: 'Архитектурные компоненты, сценарии взаимодействия и структура базы знаний'
      },
      {
        tag: 'ФУНКЦИОНАЛЬНЫЕ ВОЗМОЖНОСТИ • ЧАСТЬ 2',
        heading: 'Интеграционные шлюзы и автоматизация',
        subtitle: 'Каналы коммуникации, передача данных в CRM и протоколы безопасности'
      }
    ]
  };
}

/**
 * Formats an array of text blocks into a clean, cohesive publication layout with minimum 14px text
 */
function renderDescriptionBlocksHtml(blocks: string[]): string {
  const contentHtml = blocks.map((block) => {
    // Explicit Header block (starts with ### or looks like a major header)
    if (block.startsWith('###')) {
      const headerTitle = block.replace(/^###\s*/, '');
      return `
        <div style="margin-top: 8px; margin-bottom: 4px;">
          <h3 style="font-size: 16px; font-weight: 800; color: #fef08a; text-transform: uppercase; letter-spacing: 0.3px; margin: 0;">
            ${headerTitle}
          </h3>
        </div>
      `;
    }

    // Emoji-based sub-heading / key feature title (e.g. "✅ Индивидуальная настройка", "⚡ Интеграция")
    if (/^[✅✦🔹⚡📌⭐]\s*/.test(block)) {
      const subTitle = block.replace(/^[✅✦🔹⚡📌⭐]\s*/, '');
      return `
        <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px; margin-bottom: 3px;">
          <span style="color: #f59e0b; font-size: 14px; font-weight: bold;">✦</span>
          <span style="font-size: 15px; font-weight: 700; color: #ffffff;">${subTitle}</span>
        </div>
      `;
    }

    // Bullet point block
    if (block.startsWith('•') || block.startsWith('-') || block.startsWith('*') || block.startsWith('—')) {
      const bulletText = block.replace(/^[•\-*—]\s*/, '');
      return `
        <div style="display: flex; align-items: flex-start; gap: 8px; margin: 3px 0 4px 2px;">
          <div style="color: #f59e0b; font-size: 14px; font-weight: bold; line-height: 1.4; flex-shrink: 0;">✦</div>
          <div style="font-size: 14px; color: rgba(255, 255, 255, 0.95); line-height: 1.45;">${bulletText}</div>
        </div>
      `;
    }

    // Check if the block is a short heading-like line (e.g. "Возможности и функции:")
    if (block.length < 60 && (block.endsWith(':') || /^(возможности|функции|преимущества|архитектура|сценарии|интеграции|описание|стек|результат)/i.test(block))) {
      return `
        <div style="margin-top: 8px; margin-bottom: 4px;">
          <span style="font-size: 15.5px; font-weight: 800; color: #fef08a; text-transform: uppercase; letter-spacing: 0.2px;">
            ${block}
          </span>
        </div>
      `;
    }

    // Standard compact line with minimum 14px font size
    return `
      <div style="font-size: 14px; color: rgba(255, 255, 255, 0.92); line-height: 1.5; margin: 0 0 5px 0;">
        ${block}
      </div>
    `;
  }).join('');

  // Wrap all blocks on the page inside an elegant Liquid Glass document card
  return `
    <div style="background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 14px; padding: 18px 22px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);">
      ${contentHtml}
    </div>
  `;
}

/**
 * Generates an executive, publication-grade Commercial Proposal (КП) PDF for a marketplace product.
 */
export async function generateProductProposalPdf({
  product,
  selectedVariant,
  descriptionHtml,
  onProgress
}: ProductProposalOptions): Promise<void> {
  onProgress?.(10, 'Подготовка структуры коммерческого предложения...');

  const dateStr = new Date().toLocaleDateString('ru-RU');
  const cleanName = product.name || 'ИИ-Решение для бизнеса';
  const cleanCategory = product.category || 'ИИ-Ассистент';
  const cleanSetupTime = product.setupTime || '1-3 дня';
  const cleanSku = product.sku || `SAV-${product.id.slice(0, 6)}`;
  const cleanImageUrl = product.imageUrl || 'https://static.tildacdn.com/stor3230-3239-4336-a663-646662353539/91136143.png';

  // Resolve source description from Tabs:2
  const rawDescSource = descriptionHtml || 
    product.tab2Content || 
    product.tabs?.find(t => /описан|tabs?:?2/i.test(t.title))?.content ||
    (product.tabs && product.tabs.length > 1 ? product.tabs[1].content : '') ||
    product.fullDescription || 
    product.shortDescription || 
    '';

  const { parts, partTitles } = splitDescriptionIntoParts(rawDescSource);
  const totalPages = parts.length + 2; // Page 1 (Overview) + N Description Pages + Final Page (Tariffs)

  // Build variants dictionary
  const tariffList = ['лайт', 'эконом', 'стандарт', 'премиум', 'vip'];
  const tiersData = tariffList.map((tKey) => {
    const spec = TARIFF_SPECS[tKey];
    const defaultPrices = DEFAULT_TARIFF_PRICES[tKey];
    
    // Find variant in product if present
    const foundVariant = product.variants?.find(v => (v.name || '').toLowerCase().includes(tKey));
    const monthlyPrice = foundVariant ? foundVariant.price : defaultPrices.monthly;
    const onetimePrice = foundVariant?.oldPrice || spec.devCost || defaultPrices.onetime;
    const displayName = tKey.toUpperCase() === 'VIP' ? 'VIP' : tKey.charAt(0).toUpperCase() + tKey.slice(1);

    return {
      key: tKey,
      displayName,
      monthlyPrice,
      onetimePrice,
      spec
    };
  });

  // Staging container for high-DPI HTML rendering
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-99999px';
  container.style.left = '-99999px';
  container.style.width = '794px'; // Fixed A4 width at 96 DPI
  container.style.zIndex = '-1000';
  container.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  container.style.color = '#ffffff';
  document.body.appendChild(container);

  try {
    const logoDataUrl = await getSavAiLogoDataUrl();
    const pageElements: HTMLElement[] = [];

    // Clean official Header logo with guaranteed Base64 rendering
    const logoHtml = `
      <div style="display: inline-flex; align-items: center; gap: 10px;">
        <img src="${logoDataUrl}" crossorigin="anonymous" style="height: 38px; width: auto; object-fit: contain; filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.7));" alt="SAV AI" />
        <span style="font-size: 17px; font-weight: 900; color: #fef08a; letter-spacing: 0.6px; font-family: system-ui, sans-serif;">SAV AI</span>
      </div>
    `;

    // ----------------------------------------------------
    // PAGE 1: Overview, Image, Description & Key Features
    // ----------------------------------------------------
    const page1 = document.createElement('div');
    page1.style.width = '794px';
    page1.style.height = '1123px';
    page1.style.minHeight = '1123px';
    page1.style.maxHeight = '1123px';
    page1.style.boxSizing = 'border-box';
    page1.style.padding = '32px 36px';
    page1.style.backgroundColor = '#0b0c10';
    page1.style.backgroundImage = 'radial-gradient(circle at 10% 10%, rgba(245, 158, 11, 0.12) 0%, transparent 50%), radial-gradient(circle at 90% 90%, rgba(245, 158, 11, 0.08) 0%, transparent 50%)';
    page1.style.position = 'relative';
    page1.style.overflow = 'hidden';

    const featuresHtml = (product.features && product.features.length > 0 ? product.features : [
      'Автоматизация клиентской поддержки и продаж 24/7',
      'Квалификация лидов и ведение по воронке до сделки',
      'Интеграция с Telegram, WhatsApp, сайтом и CRM-системами',
      'Мгновенный расчет стоимости и формирование документов'
    ]).slice(0, 4).map(f => `
      <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
        <div style="color: #f59e0b; font-size: 14px; font-weight: bold; line-height: 1.3;">✦</div>
        <div style="font-size: 14px; color: rgba(255,255,255,0.95); line-height: 1.45;">${f}</div>
      </div>
    `).join('');

    page1.innerHTML = `
      <!-- Header Page 1 -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.18); padding-bottom: 12px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          ${logoHtml}
          <span style="font-size: 14px; color: rgba(255,255,255,0.8); letter-spacing: 0.5px; font-weight: 700;">Платформа ИИ-решений для бизнеса</span>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 14px; color: #fef08a; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Коммерческое предложение</div>
          <div style="font-size: 14px; color: rgba(255,255,255,0.6); margin-top: 2px;">Дата: ${dateStr}</div>
        </div>
      </div>

      <!-- Main Title & Badges -->
      <div style="margin-bottom: 16px;">
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <span style="background: rgba(245, 158, 11, 0.18); border: 1px solid rgba(245, 158, 11, 0.5); color: #fef08a; font-size: 14px; font-weight: 700; padding: 4px 12px; border-radius: 8px;">${cleanCategory}</span>
          <span style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.85); font-size: 14px; padding: 4px 12px; border-radius: 8px;">Артикул: ${cleanSku}</span>
          <span style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.85); font-size: 14px; padding: 4px 12px; border-radius: 8px;">Срок внедрения: ${cleanSetupTime}</span>
        </div>
        <h1 style="font-size: 22px; font-weight: 900; color: #ffffff; margin: 0 0 6px 0; line-height: 1.25;">
          ${cleanName}
        </h1>
        <p style="font-size: 14.5px; color: rgba(255,255,255,0.9); line-height: 1.45; margin: 0;">
          ${product.shortDescription || 'Автономный интеллектуальный ассистент для автоматизации коммуникаций, консультации клиентов и продаж.'}
        </p>
      </div>

      <!-- Two Columns: Image (left) & Advantages (right) -->
      <div style="display: grid; grid-template-columns: 290px 1fr; gap: 16px; margin-bottom: 16px;">
        <!-- Left: Product Image -->
        <div style="background: rgba(0,0,0,0.5); border: 1.5px solid rgba(245, 158, 11, 0.45); border-radius: 16px; padding: 6px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
          <img src="${cleanImageUrl}" crossorigin="anonymous" style="width: 100%; height: 215px; object-fit: cover; border-radius: 10px; display: block;" alt="${cleanName}" />
        </div>

        <!-- Right: Advantages & Efficiency -->
        <div style="background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.18); border-radius: 16px; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="font-size: 15px; font-weight: 800; color: #fef08a; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">
              Ключевые преимущества решения
            </div>
            ${featuresHtml}
          </div>
          
          <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 10px; padding: 8px 12px; margin-top: 4px;">
            <div style="font-size: 14px; color: #fef08a; font-weight: 700;">Эффект от внедрения:</div>
            <div style="font-size: 14px; color: rgba(255,255,255,0.9); margin-top: 2px;">Сокращение времени ответа до 3 секунд, рост конверсии лидов до +35%, освобождение до 80% рутины менеджеров.</div>
          </div>
        </div>
      </div>

      <!-- Solution Overview Description Box -->
      <div style="background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.15); border-radius: 14px; padding: 14px 18px; margin-bottom: 16px;">
        <div style="font-size: 15px; font-weight: 800; color: #fef08a; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
          Назначение и концепция системы
        </div>
        <p style="font-size: 14px; color: rgba(255,255,255,0.9); line-height: 1.48; margin: 0;">
          ${(product.fullDescription || product.shortDescription || 'Решение построено на передовых нейросетевых моделях и адаптируется под специфику вашего бизнеса. Обеспечивает бесшовную интеграцию с каналами коммуникации и корпоративными базами знаний.').slice(0, 420)}
        </p>
      </div>

      <!-- Footer Page 1 -->
      <div style="position: absolute; bottom: 24px; left: 36px; right: 36px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 8px; font-size: 14px; color: rgba(255,255,255,0.65);">
        <div>SAV AI • Официальное коммерческое предложение • sav-ai.ru</div>
        <div>Страница 1 из ${totalPages}</div>
      </div>
    `;

    container.appendChild(page1);
    pageElements.push(page1);

    // ----------------------------------------------------
    // DESCRIPTION PAGES (PAGES 2..N)
    // ----------------------------------------------------
    parts.forEach((partBlocks, index) => {
      const pageNum = index + 2;
      const titleInfo = partTitles[index] || {
        tag: `СПЕЦИФИКАЦИЯ • ЧАСТЬ ${index + 1}`,
        heading: 'Описание и спецификация решения',
        subtitle: 'Архитектурные компоненты и сценарии взаимодействия'
      };

      const descPage = document.createElement('div');
      descPage.style.width = '794px';
      descPage.style.height = '1123px';
      descPage.style.minHeight = '1123px';
      descPage.style.maxHeight = '1123px';
      descPage.style.boxSizing = 'border-box';
      descPage.style.padding = '32px 36px';
      descPage.style.backgroundColor = '#0b0c10';
      descPage.style.backgroundImage = 'radial-gradient(circle at 80% 20%, rgba(245, 158, 11, 0.1) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(245, 158, 11, 0.08) 0%, transparent 50%)';
      descPage.style.position = 'relative';
      descPage.style.overflow = 'hidden';

      descPage.innerHTML = `
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.18); padding-bottom: 12px; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            ${logoHtml}
            <span style="font-size: 14px; color: rgba(255,255,255,0.8); letter-spacing: 0.5px; font-weight: 700;">${titleInfo.tag}</span>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 14px; color: #fef08a; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Спецификация решения</div>
            <div style="font-size: 14px; color: rgba(255,255,255,0.6); margin-top: 2px;">Дата: ${dateStr}</div>
          </div>
        </div>

        <!-- Section Title -->
        <div style="margin-bottom: 14px;">
          <h2 style="font-size: 19px; font-weight: 900; color: #ffffff; margin: 0 0 4px 0;">
            ${titleInfo.heading}
          </h2>
          <div style="font-size: 14px; color: rgba(255,255,255,0.75);">
            ${titleInfo.subtitle}
          </div>
        </div>

        <!-- Content Blocks -->
        <div style="margin-bottom: 16px;">
          ${renderDescriptionBlocksHtml(partBlocks)}
        </div>

        <!-- Footer -->
        <div style="position: absolute; bottom: 24px; left: 36px; right: 36px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 8px; font-size: 14px; color: rgba(255,255,255,0.65);">
          <div>SAV AI • Официальное коммерческое предложение • sav-ai.ru</div>
          <div>Страница ${pageNum} из ${totalPages}</div>
        </div>
      `;

      container.appendChild(descPage);
      pageElements.push(descPage);
    });

    // ----------------------------------------------------
    // FINAL PAGE (PAGE 5): All 5 Tariff Packages & Complete Pricing Matrix
    // ----------------------------------------------------
    const finalPage = document.createElement('div');
    finalPage.style.width = '794px';
    finalPage.style.height = '1123px';
    finalPage.style.minHeight = '1123px';
    finalPage.style.maxHeight = '1123px';
    finalPage.style.boxSizing = 'border-box';
    finalPage.style.padding = '26px 32px 20px 32px';
    finalPage.style.backgroundColor = '#0b0c10';
    finalPage.style.backgroundImage = 'radial-gradient(circle at 85% 15%, rgba(245, 158, 11, 0.12) 0%, transparent 50%), radial-gradient(circle at 15% 85%, rgba(245, 158, 11, 0.08) 0%, transparent 50%)';
    finalPage.style.position = 'relative';
    finalPage.style.overflow = 'hidden';

    const tariffsCardsHtml = tiersData.map((t) => {
      const isSelected = selectedVariant ? (selectedVariant.name || '').toLowerCase().includes(t.key) : t.key === 'лайт';
      const borderColor = isSelected ? 'border: 2px solid #f59e0b;' : 'border: 1px solid rgba(255,255,255,0.15);';
      const bgColor = isSelected ? 'background: rgba(245, 158, 11, 0.14);' : 'background: rgba(0,0,0,0.45);';
      const badge = isSelected ? `<span style="background: #f59e0b; color: #000000; font-size: 14px; font-weight: 900; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.4px;">Выбран</span>` : '';

      return `
        <div style="${bgColor} ${borderColor} border-radius: 11px; padding: 7px 12px; margin-bottom: 5px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 3px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 15px; font-weight: 900; color: #ffffff;">Тариф «${t.displayName}»</span>
              ${badge}
              <span style="font-size: 14px; font-weight: 700; color: #fef08a; background: rgba(245,158,11,0.22); border: 1px solid rgba(245,158,11,0.45); padding: 2px 8px; border-radius: 6px;">${t.spec.tokenCount}</span>
            </div>
            <div style="text-align: right; display: flex; gap: 14px; align-items: baseline;">
              <div>
                <span style="font-size: 14px; color: rgba(255,255,255,0.7);">Абонплата: </span>
                <span style="font-size: 15px; font-weight: 800; color: #fef08a; font-family: monospace;">${t.monthlyPrice.toLocaleString('ru-RU')} ₽</span>
                <span style="font-size: 14px; color: rgba(255,255,255,0.6);">/мес</span>
              </div>
              <div style="border-left: 1px solid rgba(255,255,255,0.15); padding-left: 10px;">
                <span style="font-size: 14px; color: rgba(255,255,255,0.7);">Под ключ: </span>
                <span style="font-size: 15px; font-weight: 800; color: #ffffff; font-family: monospace;">${t.onetimePrice.toLocaleString('ru-RU')} ₽</span>
                <span style="font-size: 14px; color: rgba(255,255,255,0.6);">разово</span>
              </div>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 14px; color: rgba(255,255,255,0.92); margin-bottom: 2px;">
            <div>
              <span style="color: #fef08a; font-weight: 700;">• Лимиты:</span> ${t.spec.msgs}, ${t.spec.dialogs}
            </div>
            <div>
              <span style="color: #fef08a; font-weight: 700;">• Каналы:</span> ${t.spec.channels}
            </div>
          </div>

          <div style="font-size: 14px; color: rgba(255,255,255,0.95); line-height: 1.35; background: rgba(0,0,0,0.22); border-radius: 6px; padding: 4px 8px;">
            <span style="color: #fef08a; font-weight: 800;">Возможности:</span> ${t.spec.features.slice(0, 3).join(' <span style="color: #f59e0b; margin: 0 4px;">•</span> ')}
          </div>
        </div>
      `;
    }).join('');

    finalPage.innerHTML = `
      <!-- Header Final Page -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.18); padding-bottom: 8px; margin-bottom: 8px;">
        <div>
          <h2 style="font-size: 18px; font-weight: 900; color: #ffffff; margin: 0;">
            Сводная матрица всех 5 пакетов тарифов
          </h2>
          <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-top: 2px;">
            Вы можете выбрать удобный формат: помесячная подписка или разработка под ключ разовым платежом
          </div>
        </div>
        ${logoHtml}
      </div>

      <!-- Tariffs Cards List -->
      <div style="margin-bottom: 6px;">
        ${tariffsCardsHtml}
      </div>

      <!-- Extra Tokens & Maintenance Info -->
      <div style="background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 7px 12px; margin-bottom: 6px;">
        <div style="font-size: 14px; font-weight: 800; color: #fef08a; text-transform: uppercase; margin-bottom: 4px;">
          Дополнительные пакеты токенов (не сгорают в конце месяца)
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-align: center;">
          <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 4px;">
            <div style="font-size: 14px; font-weight: 700; color: #ffffff;">+10 млн токенов</div>
            <div style="font-size: 14px; color: rgba(255,255,255,0.75);">~5 000 сообщ.</div>
            <div style="font-size: 14.5px; font-weight: 800; color: #f59e0b; font-family: monospace; margin-top: 1px;">+600 ₽</div>
          </div>
          <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 4px;">
            <div style="font-size: 14px; font-weight: 700; color: #ffffff;">+50 млн токенов</div>
            <div style="font-size: 14px; color: rgba(255,255,255,0.75);">~25 000 сообщ.</div>
            <div style="font-size: 14.5px; font-weight: 800; color: #f59e0b; font-family: monospace; margin-top: 1px;">+3 000 ₽</div>
          </div>
          <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 4px;">
            <div style="font-size: 14px; font-weight: 700; color: #ffffff;">+200 млн токенов</div>
            <div style="font-size: 14px; color: rgba(255,255,255,0.75);">~100 000 сообщ.</div>
            <div style="font-size: 14.5px; font-weight: 800; color: #f59e0b; font-family: monospace; margin-top: 1px;">+12 000 ₽</div>
          </div>
          <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 4px;">
            <div style="font-size: 14px; font-weight: 700; color: #ffffff;">+400 млн токенов</div>
            <div style="font-size: 14px; color: rgba(255,255,255,0.75);">~200 000 сообщ.</div>
            <div style="font-size: 14.5px; font-weight: 800; color: #f59e0b; font-family: monospace; margin-top: 1px;">+24 000 ₽</div>
          </div>
        </div>
      </div>

      <!-- Action & Contacts Block -->
      <div style="background: rgba(245,158,11,0.14); border: 1px solid #f59e0b; border-radius: 10px; padding: 7px 12px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 14px; font-weight: 800; color: #ffffff;">Бесплатный аудит и консультация эксперта</div>
          <div style="font-size: 14px; color: rgba(255,255,255,0.85); margin-top: 1px;">
            Проведем аудит вашей воронки и подберем оптимальный тариф под ваши метрики.
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 14px; font-weight: 800; color: #fef08a;">Telegram: @SAV_AIbot</div>
          <div style="font-size: 14px; color: rgba(255,255,255,0.75); margin-top: 1px;">sav-ai.ru</div>
        </div>
      </div>

      <!-- Footer Final Page -->
      <div style="position: absolute; bottom: 20px; left: 32px; right: 32px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 6px; font-size: 14px; color: rgba(255,255,255,0.65);">
        <div>SAV AI • Официальное коммерческое предложение • sav-ai.ru</div>
        <div>Страница ${totalPages} из ${totalPages}</div>
      </div>
    `;

    container.appendChild(finalPage);
    pageElements.push(finalPage);

    // Render each page into canvas
    const renderedCanvases: HTMLCanvasElement[] = [];
    for (let i = 0; i < pageElements.length; i++) {
      const stepPercent = Math.round(20 + ((i + 1) / pageElements.length) * 65);
      onProgress?.(stepPercent, `Рендеринг страницы ${i + 1} из ${pageElements.length}...`);
      
      const c = await html2canvas(pageElements[i], {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0b0c10',
        logging: false
      });
      renderedCanvases.push(c);
    }

    onProgress?.(90, 'Формирование многостраничного PDF документа...');

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 210; // A4 width in mm
    const imgHeight = 297; // A4 height in mm

    renderedCanvases.forEach((canvas, index) => {
      if (index > 0) {
        pdf.addPage();
      }
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    });

    onProgress?.(96, 'Сохранение файла на устройство...');

    // Sanitize file name
    const sanitizedFileName = `KP_SAV_AI_${cleanName.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_')}.pdf`;
    pdf.save(sanitizedFileName);

    onProgress?.(100, 'Коммерческое предложение успешно скачано!');
  } finally {
    // Cleanup staging container
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
