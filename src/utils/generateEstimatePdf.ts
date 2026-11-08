import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface EstimatePdfData {
  company: string;
  department: string;
  employeeCount: number;
  averageSalary: number;
  currentAnnualFot: number;
  finalBotCost: number;
  annualSavings: number;
  paybackDays: number;
  selectedExpert: string;
  promoCode?: string;
  tzFunctions: string[];
  tzText: string;
  city?: string;
  imageUrl?: string;
  fullName?: string;
  contactValue?: string;
  contactType?: string;
  product?: string;
  maintenance?: string;
  uploadedDocName?: string;
}

const LOGO_URL = '/file/16/logo.png';
const BACKGROUND_URL = 'https://file.pro-talk.ru/tgf/GgMpJwQ9JCkYKglyGHQMJH08OjgMPQcqGwsLazQ6A2UURQMGKhdmYSc9Ix8ZEyRVKwssKyoEUnQKegkPahQlKWgICjY4NRQmEV9uZlUAaA11VQJrCjgDAzkkAVczLRouDiMXfQxTNBdFGT8aIyw2ZyIcIQsIKjIuHhtsBXZSBGZ5T3FP.png';

/**
 * Preload remote image as Base64 Data URL to guarantee error-free rendering in html2canvas
 */
async function preloadImageAsDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;

  // 1. Try direct fetch first
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    }
  } catch {
    // Direct fetch failed or CORS blocked, proceed to server proxy
  }

  // 2. Fallback via backend proxy
  try {
    const proxyUrl = `/api/v1/ai/calculator/proxy-image?url=${encodeURIComponent(url)}`;
    const resProxy = await fetch(proxyUrl);
    if (resProxy.ok) {
      const blob = await resProxy.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    }
  } catch (err) {
    console.warn('[PDF Preload Fallback Error]', err);
  }

  return null;
}

/**
 * Generate rivets HTML for inner containers
 */
function getRivetsHtml(): string {
  const rStyle = 'position: absolute; width: 7px; height: 7px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #fde68a, #d97706 70%, #78350f 100%); box-shadow: 1px 1px 2px rgba(0,0,0,0.85); opacity: 0.85; z-index: 5; pointer-events: none;';
  return `
    <div style="${rStyle} top: 5px; left: 5px;"></div>
    <div style="${rStyle} top: 5px; right: 5px;"></div>
    <div style="${rStyle} bottom: 5px; left: 5px;"></div>
    <div style="${rStyle} bottom: 5px; right: 5px;"></div>
  `;
}

/**
 * Split markdown text into discrete styled HTML blocks for graceful pagination
 */
function parseMarkdownToBlocks(markdown: string): string[] {
  if (!markdown) return [];

  // Clean raw markdown: remove details/summary tags and page breaks
  let cleaned = markdown
    .replace(/<\/?details[^>]*>/gi, '')
    .replace(/<\/?summary[^>]*>/gi, '')
    .replace(/\f/g, '\n')
    .replace(/<!--\s*page\s*break\s*-->/gi, '')
    .replace(/<div[^>]*page-break[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/\[\s*Разрыв\s+страницы\s*\]/gi, '')
    .replace(/^[-—_]{3,}\s*(?:Разрыв\s+страницы)?\s*[-—_]{3,}$/gim, '')
    .replace(/^(?:\s*[-*_]\s*){3,}$/gm, '')
    .trim();

  // Strip redundant top title "# Техническое задание" so it doesn't create an empty orphan card
  cleaned = cleaned.replace(/^\s*#+\s*Техническое\s+задание[^\n]*\n+/i, '').trim();

  const rawSections = cleaned.split(/\n(?=#+\s+)/g);
  const groupedSections: string[] = [];
  let pendingHeader = '';

  for (const section of rawSections) {
    const trimmedSec = section.trim();
    if (!trimmedSec) continue;

    // If section is very short (less than 130 chars, typically just a headline), merge it with the subsequent section
    if (trimmedSec.length < 130 && !trimmedSec.includes('\n\n')) {
      pendingHeader = pendingHeader ? `${pendingHeader}\n\n${trimmedSec}` : trimmedSec;
    } else {
      if (pendingHeader) {
        groupedSections.push(`${pendingHeader}\n\n${trimmedSec}`);
        pendingHeader = '';
      } else {
        groupedSections.push(trimmedSec);
      }
    }
  }

  if (pendingHeader) {
    if (groupedSections.length > 0) {
      groupedSections[groupedSections.length - 1] += `\n\n${pendingHeader}`;
    } else {
      groupedSections.push(pendingHeader);
    }
  }

  const blocks: string[] = [];

  for (const section of groupedSections) {
    const trimmedSec = section.trim();
    if (!trimmedSec) continue;

    const lines = trimmedSec.split('\n');
    let sectionHtml = '';

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        sectionHtml += '<div style="height: 6px;"></div>';
        continue;
      }

      // Convert inline markdown styles
      line = line
        .replace(/\*\*([^*]+)\*\*/g, '<strong style="color: #ffffff; font-weight: 700;">$1</strong>')
        .replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<em style="color: #d4d4d8;">$1</em>')
        .replace(/`([^`]+)`/g, '<code style="background: rgba(245, 158, 11, 0.15); padding: 1px 5px; border-radius: 4px; font-family: monospace; font-size: 14px; color: #fbbf24;">$1</code>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #fbbf24; text-decoration: underline;">$1</a>');

      // Headers
      if (/^#\s+/.test(trimmedLine)) {
        const hText = line.replace(/^#\s+/, '').trim();
        sectionHtml += `<div style="font-size: 16.5px; font-weight: 800; color: #fbbf24; margin: 8px 0 6px 0; border-bottom: 1.5px solid rgba(245, 158, 11, 0.35); padding-bottom: 4px; line-height: 1.3;">${hText}</div>`;
        continue;
      }
      if (/^##\s+/.test(trimmedLine)) {
        const hText = line.replace(/^##\s+/, '').trim();
        sectionHtml += `<div style="font-size: 15px; font-weight: 800; color: #fef08a; margin: 8px 0 4px 0; border-bottom: 1px solid rgba(245, 158, 11, 0.2); padding-bottom: 4px; line-height: 1.3;">${hText}</div>`;
        continue;
      }
      if (/^###\s+/.test(trimmedLine)) {
        const hText = line.replace(/^###\s+/, '').trim();
        sectionHtml += `<div style="font-size: 14.5px; font-weight: 700; color: #fbbf24; margin: 6px 0 3px 0; line-height: 1.3;">${hText}</div>`;
        continue;
      }
      if (/^####\s+/.test(trimmedLine)) {
        const hText = line.replace(/^####\s+/, '').trim();
        sectionHtml += `<div style="font-size: 14px; font-weight: 700; color: #ffffff; margin: 5px 0 2px 0; line-height: 1.3;">${hText}</div>`;
        continue;
      }

      // Blockquote
      if (/^>\s*/.test(trimmedLine)) {
        const qText = line.replace(/^>\s*/, '').trim();
        sectionHtml += `<div style="border-left: 3px solid #fbbf24; padding-left: 12px; margin: 6px 0; color: #d4d4d8; font-style: italic; font-size: 14px; line-height: 1.5;">${qText}</div>`;
        continue;
      }

      // Bullet items
      if (/^[-*•]\s+/.test(trimmedLine)) {
        const itemText = line.replace(/^[-*•]\s+/, '').replace(/[;,]+$/, '').trim();
        sectionHtml += `<div style="display: flex; align-items: flex-start; gap: 8px; margin: 3px 0; line-height: 1.5;"><span style="color: #fbbf24; font-size: 14px; line-height: 1.5; flex-shrink: 0;">•</span><span style="color: #e4e4e7; font-size: 14px; line-height: 1.5; word-break: break-word;">${itemText}</span></div>`;
        continue;
      }

      // Numbered list items
      const numMatch = trimmedLine.match(/^(\d+)[\.\)]\s+(.*)$/);
      if (numMatch) {
        const num = numMatch[1];
        const itemText = line.replace(/^(\d+)[\.\)]\s+/, '').replace(/[;,]+$/, '').trim();
        sectionHtml += `<div style="display: flex; align-items: flex-start; gap: 8px; margin: 4px 0; line-height: 1.5;"><span style="color: #fbbf24; font-weight: 700; font-size: 14px; line-height: 1.5; min-width: 20px; flex-shrink: 0;">${num}.</span><span style="color: #e4e4e7; font-size: 14px; line-height: 1.5; word-break: break-word;">${itemText}</span></div>`;
        continue;
      }

      // Paragraph
      const cleanP = line.replace(/[;,]+$/, '').trim();
      sectionHtml += `<div style="margin: 3px 0; line-height: 1.55; color: #e4e4e7; font-size: 14px; word-break: break-word;">${cleanP}</div>`;
    }

    if (sectionHtml) {
      blocks.push(`
        <div style="position: relative; background: rgba(20, 20, 24, 0.72); backdrop-filter: blur(12px); border: 1px solid rgba(245, 158, 11, 0.32); border-radius: 10px; padding: 12px 16px; margin-bottom: 10px;">
          ${getRivetsHtml()}
          ${sectionHtml}
        </div>
      `);
    }
  }

  return blocks;
}

export async function generateEstimatePdf(
  data: EstimatePdfData,
  onProgress?: (percent: number, stage: string) => void
): Promise<{
  blob: Blob;
  filename: string;
  downloadUrl: string;
  pdfBase64: string;
}> {
  const notify = (p: number, s: string) => {
    if (onProgress) onProgress(p, s);
  };

  notify(5, 'Инициализация параметров сметы и расчетов...');
  await new Promise(r => setTimeout(r, 60));

  // 1. Prepare values and numbers
  const count = Math.max(1, data.employeeCount || 1);
  const salaryFormatted = (data.averageSalary || 0).toLocaleString('ru-RU');
  const fotFormatted = (data.currentAnnualFot || 0).toLocaleString('ru-RU');
  const costFormatted = (data.finalBotCost || 0).toLocaleString('ru-RU');
  const savingsFormatted = (data.annualSavings || 0).toLocaleString('ru-RU');
  const paybackFormatted = data.paybackDays ? `~${data.paybackDays} дн.` : '1–2 мес.';
  const dateFormatted = new Date().toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const docNumber = `SAV-AI-${Date.now().toString().slice(-6)}`;

  // 2. Preload assets
  notify(15, 'Загрузка фирменного логотипа и фоновой текстуры...');
  const [logoDataUrl, bgDataUrl, conceptDataUrl] = await Promise.all([
    preloadImageAsDataUrl(LOGO_URL),
    preloadImageAsDataUrl(BACKGROUND_URL),
    data.imageUrl ? preloadImageAsDataUrl(data.imageUrl) : Promise.resolve(null),
  ]);

  notify(30, 'Подготовка структуры документов и макета...');
  await new Promise(r => setTimeout(r, 60));

  // 3. Autonomous functions composition
  const rawFunctions = data.tzFunctions && data.tzFunctions.length > 0
    ? data.tzFunctions
    : Array.from({ length: count }).map((_, i) => `Автономная роботизация задач сотрудника ${i + 1} подразделения «${data.department || 'Компании'}»`);

  const cleanFunctions = rawFunctions.slice(0, Math.max(Math.min(count, 4), 2)).map((fn, idx) => {
    if (typeof fn !== 'string' || !fn.trim()) {
      return `Автономный модуль ${idx + 1}: выполнение обязанностей сотрудника подразделения «${data.department || 'Компании'}»`;
    }
    return fn
      .trim()
      .replace(/^[-•*]\s*/, '')
      .replace(/^\d+[\.\)]\s*/, '')
      .replace(/[;,]+$/, '')
      .trim();
  });

  // 4. Create root hidden DOM staging area
  const stagingContainer = document.createElement('div');
  stagingContainer.id = 'sav-pdf-staging';
  stagingContainer.style.position = 'fixed';
  stagingContainer.style.left = '-9999px';
  stagingContainer.style.top = '0';
  stagingContainer.style.width = '794px';
  stagingContainer.style.overflow = 'visible';
  stagingContainer.style.boxSizing = 'border-box';
  document.body.appendChild(stagingContainer);

  const pagesElements: HTMLElement[] = [];

  const createBasePage = (pageNumber: number): { page: HTMLElement; content: HTMLElement } => {
    const page = document.createElement('div');
    page.style.width = '794px';
    page.style.height = '1123px';
    page.style.maxHeight = '1123px';
    page.style.boxSizing = 'border-box';
    page.style.padding = '28px 32px';
    page.style.position = 'relative';
    page.style.display = 'flex';
    page.style.flexDirection = 'column';
    page.style.justifyContent = 'space-between';
    page.style.overflow = 'hidden';
    page.style.color = '#ffffff';
    page.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    page.style.fontSize = '14px';
    page.style.lineHeight = '1.5';

    // Apply Dimmed Background Image with Dark Gradient Overlay
    if (bgDataUrl) {
      page.style.backgroundColor = '#0b0b0e';
      page.style.backgroundImage = `linear-gradient(180deg, rgba(11, 11, 15, 0.88) 0%, rgba(13, 13, 18, 0.92) 50%, rgba(10, 10, 14, 0.94) 100%), url("${bgDataUrl}")`;
      page.style.backgroundSize = 'cover';
      page.style.backgroundPosition = 'center';
    } else {
      page.style.backgroundColor = '#0b0b0e';
    }

    // Top Header Bar
    const topBar = document.createElement('div');
    topBar.style.borderBottom = '1.5px solid rgba(245, 158, 11, 0.45)';
    topBar.style.paddingBottom = '12px';
    topBar.style.marginBottom = '14px';
    topBar.style.display = 'flex';
    topBar.style.alignItems = 'center';
    topBar.style.justifyContent = 'space-between';

    const logoHtml = logoDataUrl
      ? `<img src="${logoDataUrl}" style="height: 46px; width: auto; max-width: 140px; object-fit: contain; flex-shrink: 0;" alt="SAV AI Logo" />`
      : `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="46" height="46" style="flex-shrink: 0;">
          <defs>
            <linearGradient id="savGoldPdf_${pageNumber}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FBBF24" />
              <stop offset="50%" stop-color="#F59E0B" />
              <stop offset="100%" stop-color="#D97706" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="#0F0F12" stroke="url(#savGoldPdf_${pageNumber})" stroke-width="3" />
          <path d="M50 16 L80 32 L80 68 L50 84 L20 68 L20 32 Z" fill="none" stroke="url(#savGoldPdf_${pageNumber})" stroke-width="2.5" opacity="0.6" />
          <text x="50" y="58" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="900" fill="#FBBF24" text-anchor="middle">SAV</text>
        </svg>
      `;

    topBar.innerHTML = `
      <div style="display: flex; align-items: center; gap: 14px;">
        <a href="https://t.me/SAV_AIbot" style="display: flex; align-items: center; text-decoration: none;">
          ${logoHtml}
        </a>
        <div>
          <div style="font-size: 18px; font-weight: 800; color: #F59E0B; line-height: 1.2;">
            SAV AI • ${pageNumber === 1 ? 'Смета и техническое задание' : 'Техническое задание на роботизацию'}
          </div>
          <div style="font-size: 14px; color: #d4d4d8; margin-top: 2px;">
            ${pageNumber === 1 ? 'Автономное веб-приложение React 18 + BD ProTalk (PostgreSQL)' : `Заказчик: «${data.company || 'Компания'}» • ${data.department || 'Подразделение'}`}
          </div>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 14px; color: #f59e0b; font-weight: 700; font-family: monospace;">${dateFormatted}</div>
        <div style="font-size: 13px; color: #a1a1aa; margin-top: 2px;">${docNumber}</div>
      </div>
    `;

    // Content container
    const content = document.createElement('div');
    content.style.flex = '1';
    content.style.overflow = 'hidden';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.justifyContent = 'flex-start';

    const contentInner = document.createElement('div');
    contentInner.style.width = '100%';
    contentInner.style.display = 'flex';
    contentInner.style.flexDirection = 'column';
    content.appendChild(contentInner);

    // Footer Bar with Interactive Links
    const footerBar = document.createElement('div');
    footerBar.style.borderTop = '1px solid rgba(255, 255, 255, 0.18)';
    footerBar.style.paddingTop = '10px';
    footerBar.style.marginTop = '10px';
    footerBar.style.display = 'flex';
    footerBar.style.alignItems = 'center';
    footerBar.style.justifyContent = 'space-between';
    footerBar.style.fontSize = '14px';
    footerBar.style.color = '#a1a1aa';

    footerBar.innerHTML = `
      <span>
        <a href="https://t.me/SAV_AIbot" style="color: #d4d4d8; text-decoration: none;">SAV AI • Платформа автономных ИИ-приложений</a>
      </span>
      <span style="color: #fbbf24; font-weight: 600;">Страница ${pageNumber}</span>
      <span>
        <a href="https://t.me/SAV_AIbot" style="color: #fbbf24; text-decoration: underline;">t.me/SAV_AIbot</a> • 
        Куратор: <a href="https://t.me/shishkarnem" style="color: #fbbf24; text-decoration: underline;">@shishkarnem</a>
      </span>
    `;

    page.appendChild(topBar);
    page.appendChild(content);
    page.appendChild(footerBar);

    return { page, content, contentInner };
  };

  try {
    // ================= PAGE 1: TITLE & COVER PAGE (HEADER, BANNER IMAGE, PASSPORT) =================
    notify(45, 'Верстка титульного листа и архитектурного концепта...');
    await new Promise(r => setTimeout(r, 60));

    const page1Obj = createBasePage(1);

    // Concept image section (STRICTLY 16:9 aspect ratio)
    const conceptImageHtml = conceptDataUrl
      ? `
        <div style="position: relative; margin-bottom: 14px; border: 1.5px solid rgba(245, 158, 11, 0.45); border-radius: 12px; overflow: hidden; background: rgba(15, 15, 20, 0.75); backdrop-filter: blur(14px); box-shadow: 0 8px 32px rgba(0,0,0,0.5);">
          ${getRivetsHtml()}
          <div style="padding: 6px 14px; background: rgba(245, 158, 11, 0.16); border-bottom: 1px solid rgba(245, 158, 11, 0.25); font-size: 14px; font-weight: 700; color: #fbbf24; display: flex; align-items: center; justify-content: space-between;">
            <span>Архитектурный концепт интерфейса ИИ-приложения</span>
            <span style="font-size: 13px; color: #fef08a; font-family: monospace;">React 18 • Liquid Glass Apple • BD ProTalk (PostgreSQL)</span>
          </div>
          <div style="padding: 8px; text-align: center; background: #070709; display: flex; align-items: center; justify-content: center;">
            <div style="width: 100%; aspect-ratio: 16 / 9; overflow: hidden; border-radius: 8px; position: relative; background: #0b0b0e; display: flex; align-items: center; justify-content: center;">
              <img src="${conceptDataUrl}" style="width: 100%; height: 100%; aspect-ratio: 16 / 9; object-fit: cover; display: block; border-radius: 8px;" alt="Интерфейс решения" />
            </div>
          </div>
        </div>
      `
      : '';

    // Contact link resolution
    let contactLink = '';
    if (data.contactValue) {
      if (data.contactValue.startsWith('@')) {
        contactLink = `https://t.me/${data.contactValue.replace('@', '')}`;
      } else if (data.contactValue.includes('@')) {
        contactLink = `mailto:${data.contactValue}`;
      } else {
        const digits = data.contactValue.replace(/\D/g, '');
        if (digits.length >= 10) {
          contactLink = `tel:+${digits}`;
        }
      }
    }

    const expertClean = (data.selectedExpert || 'Алексей Шишканов (Dr.White)').trim();
    const expertLink = 'https://t.me/shishkarnem';

    page1Obj.content.innerHTML = `
      <!-- Cover Title Header -->
      <div style="margin-bottom: 14px; text-align: center;">
        <div style="font-size: 22px; font-weight: 900; color: #fbbf24; text-transform: none; line-height: 1.25; margin-bottom: 4px;">
          Смета и техническое задание на разработку ИИ-приложения
        </div>
        <div style="font-size: 15px; color: #e4e4e7;">
          Индивидуальный проект автоматизации подразделения «<strong style="color: #ffffff;">${data.department || 'Отдел продаж'}</strong>» компании «<strong style="color: #ffffff;">${data.company || 'Клиент'}</strong>»
        </div>
      </div>

      <!-- Prominent Architecture Concept Image Banner -->
      ${conceptImageHtml}

      <!-- Project Executive Passport Box with 4 Corner Rivets -->
      <div style="position: relative; background: rgba(22, 22, 28, 0.78); backdrop-filter: blur(14px); border: 1.5px solid rgba(245, 158, 11, 0.4); border-radius: 12px; padding: 16px 20px; margin-bottom: 14px; box-shadow: 0 4px 24px rgba(0,0,0,0.4);">
        ${getRivetsHtml()}
        <div style="font-size: 15px; font-weight: 800; color: #fbbf24; margin-bottom: 10px; border-bottom: 1px solid rgba(245, 158, 11, 0.25); padding-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
          <span>Исполнительный паспорт проекта</span>
          <span style="font-size: 13px; color: #a1a1aa; font-family: monospace;">Статус: Утвержден к расчету</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 14px;">
          <div><strong style="color: #fbbf24;">Компания:</strong> <span style="color: #ffffff;">${data.company || 'Клиент'}</span></div>
          <div><strong style="color: #fbbf24;">Подразделение:</strong> <span style="color: #ffffff;">${data.department || 'Отдел продаж'}</span></div>
          ${data.product ? `<div><strong style="color: #fbbf24;">Продукт / Услуга:</strong> <span style="color: #ffffff;">${data.product}</span></div>` : ''}
          <div><strong style="color: #fbbf24;">Город реализации:</strong> <span style="color: #ffffff;">${data.city || 'РФ'}</span></div>
          <div>
            <strong style="color: #fbbf24;">Куратор проекта:</strong> 
            <a href="${expertLink}" style="color: #ffffff; text-decoration: underline; font-weight: 600;">${expertClean}</a>
          </div>
          ${data.fullName ? `<div><strong style="color: #fbbf24;">Контактное лицо:</strong> <span style="color: #ffffff;">${data.fullName}</span></div>` : ''}
          ${data.contactValue ? `
            <div>
              <strong style="color: #fbbf24;">Связь (${data.contactType || 'Telegram'}):</strong> 
              ${contactLink ? `<a href="${contactLink}" style="color: #fbbf24; text-decoration: underline; font-family: monospace;">${data.contactValue}</a>` : `<span style="color: #ffffff; font-family: monospace;">${data.contactValue}</span>`}
            </div>
          ` : ''}
          ${data.promoCode ? `<div><strong style="color: #fbbf24;">Промокод:</strong> <span style="color: #fbbf24; font-family: monospace;">${data.promoCode} (-5% скидка)</span></div>` : ''}
          <div><strong style="color: #fbbf24;">SLA-сопровождение 24/7:</strong> <span style="color: #ffffff;">${data.maintenance || 'Да (включено)'}</span></div>
          ${data.uploadedDocName ? `<div><strong style="color: #fbbf24;">Прикрепленный файл:</strong> <span style="color: #ffffff;">${data.uploadedDocName}</span></div>` : ''}
        </div>
      </div>

      <!-- Quick Executive Summary Note -->
      <div style="position: relative; background: rgba(20, 20, 26, 0.75); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 10px; padding: 12px 18px; margin-top: auto;">
        ${getRivetsHtml()}
        <div style="font-size: 14px; color: #d4d4d8; line-height: 1.55;">
          Настоящий документ содержит полный расчет инвестиций, окупаемости, архитектурного состава и технического задания на разработку автономного корпоративного веб-приложения на базе стека React 18, российской базы данных BD ProTalk (PostgreSQL) и защищенного CRM-шлюза Telegram.
        </div>
      </div>
    `;

    stagingContainer.appendChild(page1Obj.page);
    pagesElements.push(page1Obj.page);

    // ================= PAGE 2: FINANCIAL CALCULATIONS, MODULES, AND GUARANTEES =================
    notify(60, 'Формирование финансового расчета и автономных модулей...');
    await new Promise(r => setTimeout(r, 60));

    const page2Obj = createBasePage(2);

    page2Obj.content.innerHTML = `
      <!-- Financial Calculations Table (Zero Green/Red, High Contrast Liquid Glass) -->
      <div style="margin-bottom: 14px;">
        <div style="font-size: 16px; font-weight: 800; color: #fbbf24; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
          <span>1. Финансовый расчет и экономический эффект</span>
          <span style="font-size: 13px; color: #a1a1aa; font-weight: normal;">Сравнение с ФОТ отдела (${count} чел.)</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div style="position: relative; background: rgba(22, 22, 28, 0.75); border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 10px; padding: 10px 14px;">
            ${getRivetsHtml()}
            <div style="color: #a1a1aa; font-size: 14px;">Заменяемых сотрудников</div>
            <div style="font-size: 18px; font-weight: 800; color: #ffffff; margin-top: 2px;">${count} чел.</div>
          </div>
          <div style="position: relative; background: rgba(22, 22, 28, 0.75); border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 10px; padding: 10px 14px;">
            ${getRivetsHtml()}
            <div style="color: #a1a1aa; font-size: 14px;">Средняя заработная плата</div>
            <div style="font-size: 18px; font-weight: 800; color: #ffffff; margin-top: 2px;">${salaryFormatted} ₽/мес.</div>
          </div>
          <div style="position: relative; background: rgba(22, 22, 28, 0.75); border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 10px; padding: 10px 14px;">
            ${getRivetsHtml()}
            <div style="color: #a1a1aa; font-size: 14px;">Текущий годовой ФОТ отдела</div>
            <div style="font-size: 18px; font-weight: 800; color: #ffffff; margin-top: 2px;">${fotFormatted} ₽/год</div>
          </div>
          <div style="position: relative; background: rgba(245, 158, 11, 0.15); border: 1.5px solid rgba(245, 158, 11, 0.55); border-radius: 10px; padding: 10px 14px;">
            ${getRivetsHtml()}
            <div style="color: #fbbf24; font-size: 14px; font-weight: 600;">Стоимость внедрения React + BD ProTalk</div>
            <div style="font-size: 20px; font-weight: 900; color: #fbbf24; margin-top: 2px;">${costFormatted} ₽</div>
          </div>
          <div style="position: relative; background: rgba(245, 158, 11, 0.12); border: 1.5px solid rgba(245, 158, 11, 0.45); border-radius: 10px; padding: 10px 14px;">
            ${getRivetsHtml()}
            <div style="color: #fbbf24; font-size: 14px; font-weight: 600;">Чистая годовая экономия ФОТ</div>
            <div style="font-size: 20px; font-weight: 900; color: #ffffff; margin-top: 2px;">${savingsFormatted} ₽/год</div>
          </div>
          <div style="position: relative; background: rgba(22, 22, 28, 0.75); border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 10px; padding: 10px 14px;">
            ${getRivetsHtml()}
            <div style="color: #a1a1aa; font-size: 14px;">Срок полной окупаемости</div>
            <div style="font-size: 18px; font-weight: 800; color: #ffffff; margin-top: 2px;">${paybackFormatted}</div>
          </div>
        </div>
      </div>

      <!-- Autonomous Functions Block with Rivets -->
      <div style="margin-bottom: 14px;">
        <div style="font-size: 16px; font-weight: 800; color: #fbbf24; margin-bottom: 8px;">
          2. Состав ключевых автономных функций (замещение ${cleanFunctions.length} сотрудников):
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${cleanFunctions.map((fn, idx) => `
            <div style="position: relative; background: rgba(22, 22, 28, 0.75); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 8px 14px;">
              ${getRivetsHtml()}
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
                <span style="color: #fbbf24; font-weight: 700; font-size: 14px;">Модуль ${idx + 1} • Замещение сотрудника ${idx + 1}</span>
                <span style="color: #a1a1aa; font-size: 13px; font-family: monospace;">Автономный режим 24/7</span>
              </div>
              <div style="color: #ffffff; font-size: 14px; line-height: 1.45; word-break: break-word;">
                ${fn}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Tech Stack & Guarantees with Rivets -->
      <div style="position: relative; background: rgba(22, 22, 28, 0.75); border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 10px; padding: 12px 16px; margin-top: auto;">
        ${getRivetsHtml()}
        <div style="font-size: 14.5px; font-weight: 700; color: #fbbf24; margin-bottom: 5px;">
          Архитектурный стек и гарантии платформы:
        </div>
        <div style="font-size: 14px; color: #d4d4d8; line-height: 1.55;">
          • <strong>Frontend:</strong> React 18 SPA, Liquid Glass Apple дизайн, полная адаптация для ПК и смартфонов.<br/>
          • <strong>База данных:</strong> Российская защищенная база данных BD ProTalk (PostgreSQL) с облачной фиксацией состояния.<br/>
          • <strong>Интеграции:</strong> Telegram Bot API, веб-интерфейс, мгновенные уведомления и CRM-шлюз.<br/>
          • <strong>Гарантия:</strong> Официальная фиксация окупаемости и SLA-сопровождение 24/7 в договоре.
        </div>
      </div>
    `;

    stagingContainer.appendChild(page2Obj.page);
    pagesElements.push(page2Obj.page);

    // ================= PAGE 3+: FULL TECHNICAL ASSIGNMENT (SMART PAGINATION) =================
    notify(70, 'Компиляция разделов технического задания...');
    await new Promise(r => setTimeout(r, 60));

    const tzBlocks = parseMarkdownToBlocks(data.tzText || 'Техническое задание формируется в системе SAV AI.');
    let currentPageNum = 3;
    let currentObj = createBasePage(currentPageNum);
    stagingContainer.appendChild(currentObj.page);
    pagesElements.push(currentObj.page);

    // Section 3 Header in contentInner
    const tzTitle = document.createElement('div');
    tzTitle.style.fontSize = '16px';
    tzTitle.style.fontWeight = '800';
    tzTitle.style.color = '#fbbf24';
    tzTitle.style.marginBottom = '10px';
    tzTitle.textContent = '3. Полный текст технического задания (ТЗ)';
    currentObj.contentInner.appendChild(tzTitle);

    // Append blocks dynamically, measuring physical height in contentInner to prevent blank pages
    const MAX_CONTENT_HEIGHT = 920;

    for (let i = 0; i < tzBlocks.length; i++) {
      const blockHtml = tzBlocks[i];
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = blockHtml;

      currentObj.contentInner.appendChild(tempDiv);

      const isFirstPage = currentPageNum === 3;
      const minItemsOnPage = isFirstPage ? 2 : 1;

      // Check if real content height exceeded allowed maximum
      if (currentObj.contentInner.offsetHeight > MAX_CONTENT_HEIGHT && currentObj.contentInner.children.length > minItemsOnPage) {
        // Remove from current page and place on next page
        currentObj.contentInner.removeChild(tempDiv);

        currentPageNum++;
        currentObj = createBasePage(currentPageNum);
        stagingContainer.appendChild(currentObj.page);
        pagesElements.push(currentObj.page);

        // Append block to fresh page
        currentObj.contentInner.appendChild(tempDiv);
      }
    }

    // ================= RENDER TO JSPDF WITH INTERACTIVE CLICKABLE LINKS =================
    notify(85, 'Рендеринг графических слоев A4 высокой четкости...');
    await new Promise(r => setTimeout(r, 60));

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    for (let i = 0; i < pagesElements.length; i++) {
      const pageEl = pagesElements[i];
      const pageProgress = 85 + Math.floor((i / pagesElements.length) * 10);
      notify(pageProgress, `Рендеринг страницы ${i + 1} из ${pagesElements.length}...`);

      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0b0b0e',
        logging: false,
        windowWidth: 794,
      });

      if (i > 0) {
        doc.addPage();
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);

      // Extract all links on this page and make them clickable in the PDF
      const linkElements = pageEl.querySelectorAll('a[href]');
      const pageRect = pageEl.getBoundingClientRect();

      linkElements.forEach((linkEl) => {
        const href = linkEl.getAttribute('href');
        if (!href || !/^https?:\/\//i.test(href)) return;

        const linkRect = linkEl.getBoundingClientRect();
        const x = ((linkRect.left - pageRect.left) / pageRect.width) * 210;
        const y = ((linkRect.top - pageRect.top) / pageRect.height) * 297;
        const w = (linkRect.width / pageRect.width) * 210;
        const h = (linkRect.height / pageRect.height) * 297;

        if (w > 0 && h > 0) {
          doc.link(x, y, w, h, { url: href });
        }
      });
    }

    notify(96, 'Создание файла и упаковка PDF...');
    await new Promise(r => setTimeout(r, 60));

    const companySlug = (data.company || 'Project').replace(/[^\wа-яА-ЯёЁ]+/g, '_');
    const filename = `SAV_AI_Smeta_${companySlug}_${Date.now()}.pdf`;
    const pdfBlob = doc.output('blob');
    const downloadUrl = URL.createObjectURL(pdfBlob);
    const pdfBase64 = doc.output('datauristring');

    notify(100, 'Смета успешно сформирована!');

    return {
      blob: pdfBlob,
      filename,
      downloadUrl,
      pdfBase64,
    };
  } finally {
    if (document.body.contains(stagingContainer)) {
      document.body.removeChild(stagingContainer);
    }
  }
}
