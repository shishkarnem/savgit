import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PlanData, BusinessInfo } from '@/types';
import { getSavAiLogoDataUrl } from './pdfLogoHelper';

interface PdfExportOptions {
  companyName: string;
  businessInfo?: BusinessInfo | null;
  businessDescription?: string | null;
  plans: PlanData[];
  paymentType: 'monthly' | 'onetime';
  discountPercent?: number;
  imageUrl?: string | null;
  singlePlan?: PlanData | null;
  onProgress?: (progress: number, statusText: string) => void;
}

/**
 * Generates an executive, publication-grade PDF presentation for SAV AI tariffs using HTML canvas rendering.
 * Ensures flawless Cyrillic support, strict 16:9 visual ratios, dark/gold luxury Liquid Glass Apple aesthetic,
 * non-truncated multi-page specifications with dedicated page for full blueprint markdown without clipping,
 * adaptive typography scaling, progress reporting, and minimal font-size >= 14px.
 */
export async function generatePresentationPdf({
  companyName,
  businessInfo,
  businessDescription,
  plans,
  paymentType,
  discountPercent = 0,
  imageUrl,
  singlePlan = null,
  onProgress
}: PdfExportOptions): Promise<void> {
  onProgress?.(5, 'Подготовка структуры документа...');
  const cleanCompany = (companyName || '').trim() || 'Ваша компания';
  const cleanSphere = businessInfo?.sphere || 'Торговля';
  const cleanCategory = businessInfo?.category || 'Товары';
  const cleanSegment = businessInfo?.segment || 'B2C';
  const cleanDesc = (businessDescription || businessInfo?.description || 'Автоматизация воронки продаж, квалификация лидов 24/7 и интеграция с CRM.').trim();
  const dateStr = new Date().toLocaleDateString('ru-RU');

  // Create an offscreen staging container with fixed A4 dimensions (794 x 1123 px at 96 DPI)
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-99999px';
  container.style.left = '-99999px';
  container.style.width = '794px';
  container.style.zIndex = '-1000';
  container.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  container.style.color = '#ffffff';
  document.body.appendChild(container);

  const logoDataUrl = await getSavAiLogoDataUrl();

  const applyDiscount = (price: number) => {
    if (discountPercent > 0) {
      return Math.round(price * (1 - discountPercent / 100));
    }
    return price;
  };

  const splitNumberedList = (items: string | string[]): string[] => {
    if (!items) return [];
    if (Array.isArray(items)) {
      return items.map(it => it.trim()).filter(Boolean);
    }
    return String(items)
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
  };

  /**
   * Formats markdown text with minimum 14px font size
   */
  const formatMarkdownForPdf = (md?: string, forceCompact: boolean = false): string => {
    if (!md) return '';
    const lines = md.split(/\r?\n/);
    const lineCount = lines.filter(l => l.trim().length > 0).length;
    const isVeryLong = lineCount > 24 || md.length > 1400 || forceCompact;

    const titleH2Size = isVeryLong ? '16px' : '18px';
    const titleH3Size = isVeryLong ? '15px' : '16px';
    const textSize = '14px';
    const lineHeight = '1.45';
    const itemGap = isVeryLong ? '3px' : '5px';
    const headerMarginTop = isVeryLong ? '6px' : '10px';

    return lines
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed) return `<div style="height: ${isVeryLong ? '3px' : '6px'};"></div>`;
        if (trimmed.startsWith('### ')) {
          const text = trimmed.replace(/^###\s+/, '');
          return `<div style="font-size: ${titleH3Size}; font-weight: 800; color: #fef08a; margin-top: ${headerMarginTop}; margin-bottom: 3px; text-transform: uppercase; border-bottom: 1px solid rgba(245, 158, 11, 0.3); padding-bottom: 2px;">${text}</div>`;
        }
        if (trimmed.startsWith('## ')) {
          const text = trimmed.replace(/^##\s+/, '');
          return `<div style="font-size: ${titleH2Size}; font-weight: 800; color: #f59e0b; margin-top: ${headerMarginTop}; margin-bottom: 4px;">${text}</div>`;
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const text = trimmed.replace(/^[-*]\s+/, '').replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fef08a;">$1</strong>');
          return `<div style="display: flex; gap: 8px; align-items: flex-start; font-size: ${textSize}; color: #f4f4f5; margin-bottom: ${itemGap}; line-height: ${lineHeight};"><span style="color: #f59e0b; font-weight: bold; font-size: ${textSize};">•</span><span>${text}</span></div>`;
        }
        if (/^\d+\.\s+/.test(trimmed)) {
          const num = trimmed.match(/^(\d+)\.\s+/)?.[1] || '1';
          const text = trimmed.replace(/^\d+\.\s+/, '').replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fef08a;">$1</strong>');
          return `<div style="display: flex; gap: 8px; align-items: flex-start; font-size: ${textSize}; color: #f4f4f5; margin-bottom: ${itemGap}; line-height: ${lineHeight};"><span style="color: #f59e0b; font-weight: 700; font-size: ${textSize};">${num}.</span><span>${text}</span></div>`;
        }
        const formatted = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fef08a;">$1</strong>');
        return `<div style="font-size: ${textSize}; color: #e4e4e7; line-height: ${lineHeight}; margin-bottom: ${itemGap};">${formatted}</div>`;
      })
      .join('');
  };

  const pagesHtml: string[] = [];

  // Helper styles for pages (Pure luxury dark charcoal / obsidian)
  const pageBaseStyle = `
    width: 794px;
    min-height: 1123px;
    height: 1123px;
    box-sizing: border-box;
    padding: 26px 32px 20px 32px;
    background: #0a0a0c;
    background: linear-gradient(155deg, #09090b 0%, #141418 50%, #0c0c0e 100%);
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  `;

  const headerHtml = (title: string, subtitle: string) => `
    <div style="border-bottom: 1.5px solid rgba(245, 158, 11, 0.45); padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; align-items: center; gap: 14px;">
        <div style="display: inline-flex; align-items: center; gap: 10px;">
          <img src="${logoDataUrl}" crossorigin="anonymous" style="height: 38px; width: auto; object-fit: contain; filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.7));" alt="SAV AI" />
          <span style="font-size: 17px; font-weight: 900; color: #fef08a; letter-spacing: 0.6px; font-family: system-ui, sans-serif;">SAV AI</span>
        </div>
        <div>
          <div style="font-size: 14px; font-weight: 700; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.5px;">Архитектура нейросетевых продаж 2026</div>
          <div style="font-size: 17px; font-weight: 800; color: #fef08a; letter-spacing: -0.2px;">${title}</div>
        </div>
      </div>
      <div style="font-size: 14px; color: #cbd5e1; font-weight: 500; text-align: right;">${subtitle}</div>
    </div>
  `;

  const footerHtml = (pageIndex: number, totalPages: number) => `
    <div style="border-top: 1px solid rgba(245, 158, 11, 0.3); padding-top: 8px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 14px; color: #a1a1aa;">
      <div style="display: flex; gap: 16px; align-items: center;">
        <span style="font-weight: 700; color: #f59e0b; font-size: 14px;">SAV AI</span>
        <span>•</span>
        <span style="color: #fef08a; font-weight: 600; font-size: 14px;">sav-ai.ru</span>
        <span>•</span>
        <span>Telegram: @SAV_AIbot</span>
      </div>
      <div style="color: #f4f4f5; font-weight: 600; font-size: 14px;">Стр. ${pageIndex} из ${totalPages}</div>
    </div>
  `;

  if (singlePlan) {
    // =========================================================================
    // SINGLE TARIFF PERSONALIZED DOCUMENT (4 DEDICATED COMPLETE PAGES)
    // =========================================================================
    const totalSinglePages = 4;
    const monthlyBase = singlePlan.monthlyPrice || singlePlan.priceMonth || 10000;
    const onetimeBase = singlePlan.onetimePrice || Math.round(monthlyBase / 0.2);
    const finalMonthly = applyDiscount(monthlyBase);
    const finalOnetime = applyDiscount(onetimeBase);
    const rawFeats = singlePlan.baseFeatures || singlePlan.features || [];
    const allFeatures = splitNumberedList(rawFeats);
    const benefits = Array.isArray(singlePlan.key_benefits) ? singlePlan.key_benefits : [];
    const customTitle = singlePlan.custom_title || singlePlan.name || `SAV AI Продавец ${singlePlan.package}`;
    const customDesc = singlePlan.custom_description || singlePlan.fullDescription || 'Автономный комплекс квалификации клиентов, автодожима и закрытия сделок.';
    const blueprintMd = singlePlan.full_blueprint_markdown || singlePlan.blueprintMarkdown || '';
    const roiVal = singlePlan.roi_highlight || singlePlan.roiHighlight || 'Окупаемость решения в первый месяц работы при сохранении текущего потока обращений.';

    // PAGE 1: Specification, Business Profile & 16:9 Image
    pagesHtml.push(`
      <div style="${pageBaseStyle}">
        <div>
          ${headerHtml(`Тариф «${singlePlan.package}» — Персональное КП`, `Для компании: «${cleanCompany}»`)}
          
          <!-- Business Profile Box -->
          <div style="background: rgba(18, 18, 22, 0.85); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 14px; padding: 14px 18px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 14px; font-weight: 700; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.5px;">Параметры интеграции бизнеса</span>
              <span style="font-size: 14px; color: #a1a1aa;">Дата: ${dateStr}</span>
            </div>
            <div style="font-size: 14px; color: #f4f4f5; line-height: 1.45; margin-bottom: 4px;">
              <strong>Компания:</strong> «${cleanCompany}» &nbsp;|&nbsp; <strong>Сфера:</strong> ${cleanSphere} &nbsp;|&nbsp; <strong>Сегмент:</strong> ${cleanSegment} &nbsp;|&nbsp; <strong>Категория:</strong> ${cleanCategory}
            </div>
            <div style="font-size: 14px; color: #d4d4d8; line-height: 1.45;">
              ${cleanDesc}
            </div>
          </div>

          ${imageUrl ? `
            <!-- Strictly 16:9 Image Container -->
            <div style="width: 730px; height: 350px; border-radius: 14px; overflow: hidden; border: 1.5px solid rgba(245, 158, 11, 0.45); margin-bottom: 12px; position: relative; box-sizing: border-box;">
              <img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" />
              <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.95), transparent); padding: 12px 18px; font-size: 14px; color: #fef08a; font-weight: 700;">
                Концепция визуального ИИ-продавца для «${cleanCompany}» (Формат 16:9)
              </div>
            </div>
          ` : ''}

          <!-- Tariff Summary Card -->
          <div style="background: rgba(18, 18, 22, 0.85); border: 1.5px solid rgba(245, 158, 11, 0.5); border-radius: 14px; padding: 14px 18px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <div style="font-size: 17px; font-weight: 800; color: #fef08a;">
                ${customTitle}
              </div>
              <div style="font-size: 14px; font-weight: 700; color: #f59e0b; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); padding: 3px 10px; border-radius: 16px;">
                Срок запуска: ${singlePlan.duration || '3-5 дней'}
              </div>
            </div>

            <div style="font-size: 14px; color: #e4e4e7; line-height: 1.45; margin-bottom: 8px;">
              ${customDesc}
            </div>

            ${benefits.length > 0 ? `
              <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 10px; padding: 8px 12px; margin-bottom: 8px;">
                <div style="font-size: 14px; font-weight: 700; color: #fef08a; text-transform: uppercase; margin-bottom: 4px;">Ключевые преимущества решения:</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                  ${benefits.map(b => `
                    <div style="display: flex; align-items: flex-start; gap: 6px; font-size: 14px; color: #f4f4f5; line-height: 1.35;">
                      <span style="color: #f59e0b; font-weight: bold;">•</span>
                      <span>${b}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 8px;">
              <div>
                <span style="font-size: 14px; color: #a1a1aa;">Выбранный формат: </span>
                <span style="font-size: 14px; font-weight: 700; color: #ffffff;">${paymentType === 'onetime' ? 'Под ключ' : 'Ежемесячно'}</span>
                ${discountPercent > 0 ? `<span style="font-size: 14px; color: #f59e0b; margin-left: 6px;">(Скидка ${discountPercent}%)</span>` : ''}
              </div>
              <div style="font-size: 18px; font-weight: 800; color: #fef08a;">
                ${paymentType === 'onetime' ? `${finalOnetime.toLocaleString('ru-RU')} ₽` : `${finalMonthly.toLocaleString('ru-RU')} ₽/мес`}
              </div>
            </div>
          </div>
        </div>

        ${footerHtml(1, totalSinglePages)}
      </div>
    `);

    // PAGE 2: Full Dedicated Architectural Plan & Markdown Scenarios (Stand-alone page)
    pagesHtml.push(`
      <div style="${pageBaseStyle}">
        <div>
          ${headerHtml(`Архитектурный план и сценарии решения`, `Тариф «${singlePlan.package}»`)}

          <!-- Detailed Blueprint Markdown Section -->
          <div style="background: rgba(18, 18, 22, 0.9); border: 1.5px solid rgba(245, 158, 11, 0.45); border-radius: 14px; padding: 18px 22px; box-sizing: border-box;">
            <div style="font-size: 15px; font-weight: 800; color: #f59e0b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
              Детальная спецификация нейросетевых сценариев:
            </div>
            ${blueprintMd ? formatMarkdownForPdf(blueprintMd) : `
              <div style="font-size: 14px; color: #d4d4d8; line-height: 1.5;">
                <div style="margin-bottom: 8px;"><strong>1. Воронка первичного диалога:</strong> моментальный захват внимания клиента, распознавание потребности по смыслу запроса и точный подбор номенклатуры товаров/услуг.</div>
                <div style="margin-bottom: 8px;"><strong>2. Модуль расчета стоимости:</strong> интерактивный расчет по калькулятору и прайс-листу компании прямо в окне чата.</div>
                <div style="margin-bottom: 8px;"><strong>3. Квалификация и сбор контактов:</strong> вежливая фиксация имени, номера телефона, параметров заказа и передача лида в CRM.</div>
                <div style="margin-bottom: 8px;"><strong>4. Автодожим и работа с возражениями:</strong> аргументированная отработка сомнений («дорого», «я подумаю») на основе регламентов.</div>
                <div><strong>5. Генерация документов:</strong> автоматическая отправка коммерческих предложений и презентаций в диалог.</div>
              </div>
            `}
          </div>
        </div>

        ${footerHtml(2, totalSinglePages)}
      </div>
    `);

    // PAGE 3: All Features, Included Limits, ROI & Investment Terms
    pagesHtml.push(`
      <div style="${pageBaseStyle}">
        <div>
          ${headerHtml(`Включенные опции, лимиты и окупаемость`, `Тариф «${singlePlan.package}»`)}

          <!-- All Features List -->
          <div style="background: rgba(18, 18, 22, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 14px; padding: 14px 18px; margin-bottom: 12px;">
            <div style="font-size: 15px; font-weight: 800; color: #fef08a; margin-bottom: 10px; text-transform: uppercase;">
              Включенные опции и модули (${allFeatures.length}):
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              ${allFeatures.map(f => `
                <div style="display: flex; align-items: flex-start; gap: 7px; font-size: 14px; color: #f4f4f5; line-height: 1.4;">
                  <span style="color: #f59e0b; font-weight: 800; font-size: 14px;">✓</span>
                  <span>${f}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Limits and Consumables -->
          <div style="background: rgba(18, 18, 22, 0.85); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 14px; padding: 14px 18px; margin-bottom: 12px;">
            <div style="font-size: 15px; font-weight: 800; color: #fef08a; margin-bottom: 8px; text-transform: uppercase;">
              Расходные ресурсы и лимиты в тарифе:
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 14px; color: #e4e4e7; line-height: 1.45;">
              <div>🔹 <strong>Ежемесячный пакет:</strong> 20 млн токенов (хватает до 10 000 сообщений, 100 диалогов с клиентами).</div>
              <div>🔹 <strong>Дополнительный пакет:</strong> докупка 600 ₽ за каждые 10 млн токенов (~5 000 сообщ.) при росте трафика.</div>
              <div>🔹 <strong>Каналы интеграции:</strong> до 3 мессенджеров на выбор (Telegram, WhatsApp, Web-чат).</div>
            </div>
          </div>

          <!-- ROI Box -->
          <div style="background: rgba(245, 158, 11, 0.1); border: 1.5px solid rgba(245, 158, 11, 0.4); border-radius: 14px; padding: 14px 18px; margin-bottom: 12px;">
            <div style="font-size: 14px; color: #f59e0b; font-weight: 700; text-transform: uppercase; margin-bottom: 3px;">Прогнозная окупаемость и экономический эффект:</div>
            <div style="font-size: 14.5px; font-weight: 700; color: #fef08a; line-height: 1.4;">
              ${roiVal}
            </div>
          </div>

          <!-- Pricing Block -->
          <div style="background: rgba(18, 18, 22, 0.95); border: 1.5px solid rgba(245, 158, 11, 0.5); border-radius: 14px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 14px; color: #a1a1aa; font-weight: 700; text-transform: uppercase;">Инвестиции в решение</div>
              <div style="font-size: 14px; color: #cbd5e1; margin-top: 2px;">
                Формат оплаты: <strong>${paymentType === 'onetime' ? 'Единоразово под ключ' : 'Ежемесячная подписка'}</strong>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 18px; font-weight: 800; color: #fef08a;">
                ${finalMonthly.toLocaleString('ru-RU')} ₽/мес
              </div>
              <div style="font-size: 14px; color: #d4d4d8; margin-top: 2px;">
                или ${finalOnetime.toLocaleString('ru-RU')} ₽ под ключ
              </div>
            </div>
          </div>
        </div>

        ${footerHtml(3, totalSinglePages)}
      </div>
    `);

    // PAGE 4: Roadmap, Guarantees & Contacts on sav-ai.ru
    pagesHtml.push(`
      <div style="${pageBaseStyle}">
        <div>
          ${headerHtml('Этапы запуска и гарантии внедрения', 'Согласование и старт')}

          <!-- Stages -->
          <div style="background: rgba(18, 18, 22, 0.85); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 14px; padding: 16px 18px; margin-bottom: 12px;">
            <div style="font-size: 15px; font-weight: 800; color: #fef08a; margin-bottom: 10px;">5 этапов запуска проекта:</div>
            
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; gap: 10px; align-items: flex-start;">
                <div style="background: #f59e0b; color: #000; font-weight: 800; font-size: 14px; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; shrink-0;">1</div>
                <div>
                  <div style="font-size: 14px; font-weight: 700; color: #ffffff;">Сбор базы знаний и аудит процессов</div>
                  <div style="font-size: 14px; color: #cbd5e1; line-height: 1.4;">Анализ регламентов, номенклатуры товаров/услуг и скриптов обработки (1-2 дня).</div>
                </div>
              </div>

              <div style="display: flex; gap: 10px; align-items: flex-start;">
                <div style="background: #f59e0b; color: #000; font-weight: 800; font-size: 14px; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; shrink-0;">2</div>
                <div>
                  <div style="font-size: 14px; font-weight: 700; color: #ffffff;">Проектирование нейросетевых сценариев</div>
                  <div style="font-size: 14px; color: #cbd5e1; line-height: 1.4;">Квалификация лидов, отработка возражений, автодожим и калькулятор цен (2 дня).</div>
                </div>
              </div>

              <div style="display: flex; gap: 10px; align-items: flex-start;">
                <div style="background: #f59e0b; color: #000; font-weight: 800; font-size: 14px; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; shrink-0;">3</div>
                <div>
                  <div style="font-size: 14px; font-weight: 700; color: #ffffff;">Интеграция каналов и CRM</div>
                  <div style="font-size: 14px; color: #cbd5e1; line-height: 1.4;">Подключение мессенджеров (Telegram, WhatsApp, Web-чат), AmoCRM, Bitrix24 и таблиц (2-3 дня).</div>
                </div>
              </div>

              <div style="display: flex; gap: 10px; align-items: flex-start;">
                <div style="background: #f59e0b; color: #000; font-weight: 800; font-size: 14px; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; shrink-0;">4</div>
                <div>
                  <div style="font-size: 14px; font-weight: 700; color: #ffffff;">Тестирование и тюнинг точности</div>
                  <div style="font-size: 14px; color: #cbd5e1; line-height: 1.4;">Закрытое тестирование на реальных диалогах и калибровка ответов (1 день).</div>
                </div>
              </div>

              <div style="display: flex; gap: 10px; align-items: flex-start;">
                <div style="background: #f59e0b; color: #000; font-weight: 800; font-size: 14px; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; shrink-0;">5</div>
                <div>
                  <div style="font-size: 14px; font-weight: 700; color: #ffffff;">Запуск в промышленную эксплуатацию</div>
                  <div style="font-size: 14px; color: #cbd5e1; line-height: 1.4;">Передача доступов, обучение персонала и подключение аналитики (1 день).</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Guarantees -->
          <div style="background: rgba(18, 18, 22, 0.85); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 14px; padding: 14px 18px; margin-bottom: 12px;">
            <div style="font-size: 15px; font-weight: 800; color: #fef08a; margin-bottom: 6px;">Гарантии SAV AI:</div>
            <div style="display: flex; flex-direction: column; gap: 5px; font-size: 14px; color: #f4f4f5; line-height: 1.45;">
              <div>🔹 Бесперебойная работа 24/7/365 со скоростью ответа до 2 секунд.</div>
              <div>🔹 Защищенное хранение баз данных на сервере и синхронизация по SSL.</div>
              <div>🔹 Ежемесячное обновление лимитов токенов и сообщений (докупка 600 ₽ за 10 млн токенов на ~5 000 сообщ.).</div>
              <div>🔹 Полная передача настроек и сценариев при покупке «Под ключ».</div>
            </div>
          </div>

          <!-- Contacts -->
          <div style="background: rgba(18, 18, 22, 0.95); border: 1.5px solid rgba(245, 158, 11, 0.55); border-radius: 14px; padding: 14px 18px;">
            <div style="font-size: 15px; font-weight: 800; color: #fef08a; margin-bottom: 6px;">Контакты для согласования:</div>
            <div style="font-size: 14px; color: #ffffff; line-height: 1.55;">
              <div>• Telegram бот: <strong>@SAV_AIbot</strong></div>
              <div>• Официальный портал: <strong>sav-ai.ru</strong></div>
              <div>• Бесплатный аудит: доступен на платформе в 1 клик</div>
            </div>
          </div>
        </div>

        ${footerHtml(4, totalSinglePages)}
      </div>
    `);

  } else {
    // =========================================================================
    // "DOWNLOAD ALL" COMPREHENSIVE PRESENTATION
    // =========================================================================
    const totalDocPages = 1 + (plans.length * 2) + 1; // Cover + (1 Main Spec Page + 1 Dedicated Full Blueprint Page per Tariff) + Summary/Roadmap

    // PAGE 1: Executive Cover & Profile + 16:9 Image
    pagesHtml.push(`
      <div style="${pageBaseStyle}">
        <div>
          ${headerHtml('Коммерческое предложение и спецификации ИИ-продавца', `SAV AI 2026`)}

          <!-- Cover Title Box -->
          <div style="background: rgba(18, 18, 22, 0.85); border: 1.5px solid rgba(245, 158, 11, 0.45); border-radius: 16px; padding: 18px 22px; margin-bottom: 14px;">
            <div style="font-size: 14px; font-weight: 700; color: #f59e0b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Индивидуальное архитектурное решение</div>
            <div style="font-size: 22px; font-weight: 800; color: #fef08a; margin-bottom: 8px;">
              Архитектура ИИ-продавца для «${cleanCompany}»
            </div>
            <div style="font-size: 14px; color: #d4d4d8; display: flex; gap: 16px; flex-wrap: wrap;">
              <span><strong>Дата расчета:</strong> ${dateStr}</span>
              <span><strong>Сфера:</strong> ${cleanSphere}</span>
              <span><strong>Сегмент:</strong> ${cleanSegment}</span>
              <span><strong>Категория:</strong> ${cleanCategory}</span>
            </div>
          </div>

          ${imageUrl ? `
            <!-- Strictly 16:9 Visual Image Container -->
            <div style="width: 730px; height: 380px; border-radius: 14px; overflow: hidden; border: 1.5px solid rgba(245, 158, 11, 0.4); margin-bottom: 14px; position: relative; box-sizing: border-box;">
              <img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" />
              <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.95), transparent); padding: 14px 20px; font-size: 14px; color: #fef08a; font-weight: 700;">
                Концепция визуального ИИ-продавца для «${cleanCompany}» (Формат 16:9)
              </div>
            </div>
          ` : ''}

          <!-- Business Goal Box -->
          <div style="background: rgba(18, 18, 22, 0.85); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 14px; padding: 16px 20px;">
            <div style="font-size: 14px; font-weight: 800; color: #f59e0b; margin-bottom: 6px; text-transform: uppercase;">Цели внедрения и задачи автоматизации:</div>
            <div style="font-size: 14px; color: #f4f4f5; line-height: 1.5;">
              ${cleanDesc}
            </div>
          </div>
        </div>

        ${footerHtml(1, totalDocPages)}
      </div>
    `);

    let currentComprehensivePage = 1;

    plans.forEach((p, idx) => {
      currentComprehensivePage += 1;
      const mainSpecPageNum = currentComprehensivePage;
      const mBase = p.monthlyPrice || p.priceMonth || 10000;
      const oBase = p.onetimePrice || Math.round(mBase / 0.2);
      const fM = applyDiscount(mBase);
      const fO = applyDiscount(oBase);
      const rawFeats = p.baseFeatures || p.features || [];
      const allFeat = splitNumberedList(rawFeats);
      const benefits = Array.isArray(p.key_benefits) ? p.key_benefits : [];
      const descText = p.custom_description || p.fullDescription || 'Автономный комплекс квалификации клиентов, автодожима и закрытия сделок.';
      const roiText = p.roi_highlight || p.roiHighlight;
      const bpMd = p.full_blueprint_markdown || p.blueprintMarkdown || '';

      // 1. Main Specs & Features Page
      pagesHtml.push(`
        <div style="${pageBaseStyle}">
          <div>
            ${headerHtml(`Тариф «${p.package}» — Спецификация и модули`, `Пакет ${idx + 1} из ${plans.length}`)}

            <!-- Tariff Main Header Box -->
            <div style="background: rgba(18, 18, 22, 0.9); border: 1.5px solid ${idx === 2 ? 'rgba(245, 158, 11, 0.7)' : 'rgba(255, 255, 255, 0.15)'}; border-radius: 12px; padding: 14px 18px; margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <div>
                  <span style="font-size: 18px; font-weight: 800; color: #fef08a;">Тариф «${p.package}»</span>
                  ${(p.custom_title || p.name) && (p.custom_title || p.name) !== p.package ? `<span style="font-size: 14px; font-weight: 600; color: #ffffff; margin-left: 8px;">— ${p.custom_title || p.name}</span>` : ''}
                </div>
                ${p.duration ? `<span style="font-size: 14px; font-weight: 700; color: #f59e0b; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); padding: 3px 10px; border-radius: 12px;">Срок: ${p.duration}</span>` : ''}
              </div>

              <div style="font-size: 14px; color: #e4e4e7; line-height: 1.45; margin-bottom: 10px;">
                ${descText}
              </div>

              ${benefits.length > 0 ? `
                <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 10px; padding: 8px 12px;">
                  <div style="font-size: 14px; font-weight: 700; color: #fef08a; text-transform: uppercase; margin-bottom: 5px;">Ключевые преимущества решения:</div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                    ${benefits.map(b => `
                      <div style="display: flex; align-items: flex-start; gap: 5px; font-size: 14px; color: #f4f4f5; line-height: 1.35;">
                        <span style="color: #f59e0b; font-weight: bold;">•</span>
                        <span>${b}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- All Included Features -->
            <div style="background: rgba(0, 0, 0, 0.45); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; padding: 12px 16px; margin-bottom: 12px;">
              <div style="font-size: 14px; font-weight: 700; color: #f59e0b; margin-bottom: 6px; text-transform: uppercase;">
                Включенные модули и функциональные блоки (${allFeat.length}):
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                ${allFeat.slice(0, 12).map(f => `
                  <div style="display: flex; align-items: flex-start; gap: 6px; font-size: 14px; color: #f4f4f5; line-height: 1.35;">
                    <span style="color: #f59e0b; font-weight: 700;">✓</span>
                    <span>${f}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            ${roiText ? `
              <div style="font-size: 14px; color: #fef08a; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 10px; padding: 8px 12px; margin-bottom: 12px;">
                <strong>Окупаемость и эффект:</strong> ${roiText}
              </div>
            ` : ''}

            <!-- Pricing Row -->
            <div style="background: rgba(18, 18, 22, 0.95); border: 1.5px solid rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center;">
              <div style="font-size: 15px; font-weight: 800; color: #fef08a;">
                Ежемесячно: ${fM.toLocaleString('ru-RU')} ₽/мес
              </div>
              <div style="font-size: 14.5px; font-weight: 700; color: #ffffff;">
                Под ключ: ${fO.toLocaleString('ru-RU')} ₽
              </div>
            </div>
          </div>

          ${footerHtml(mainSpecPageNum, totalDocPages)}
        </div>
      `);

      // 2. Dedicated Separate Full Blueprint Markdown Page for this Tariff
      currentComprehensivePage += 1;
      const bpPageNum = currentComprehensivePage;

      pagesHtml.push(`
        <div style="${pageBaseStyle}">
          <div>
            ${headerHtml(`Архитектурный план и сценарии: Тариф «${p.package}»`, `Пакет ${idx + 1} из ${plans.length}`)}

            <!-- Full Blueprint Markdown (DEDICATED FULL SHEET) -->
            <div style="background: rgba(18, 18, 22, 0.92); border: 1.5px solid rgba(245, 158, 11, 0.45); border-radius: 14px; padding: 18px 22px; box-sizing: border-box;">
              <div style="font-size: 14px; font-weight: 800; color: #f59e0b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                Детальная спецификация нейросетевых сценариев:
              </div>
              ${bpMd ? formatMarkdownForPdf(bpMd, false) : `
                <div style="font-size: 14px; color: #d4d4d8; line-height: 1.5;">
                  <div style="margin-bottom: 8px;"><strong>1. Воронка первичного диалога:</strong> моментальный захват внимания клиента, распознавание потребности по смыслу запроса и точный подбор номенклатуры товаров/услуг.</div>
                  <div style="margin-bottom: 8px;"><strong>2. Модуль расчета стоимости:</strong> интерактивный расчет по калькулятору и прайс-листу компании прямо в окне чата.</div>
                  <div style="margin-bottom: 8px;"><strong>3. Квалификация и сбор контактов:</strong> вежливая фиксация имени, номера телефона, параметров заказа и передача лида в CRM.</div>
                  <div style="margin-bottom: 8px;"><strong>4. Автодожим и работа с возражениями:</strong> аргументированная отработка сомнений («дорого», «я подумаю») на основе регламентов.</div>
                  <div><strong>5. Генерация документов:</strong> автоматическая отправка коммерческих предложений и презентаций в диалог.</div>
                </div>
              `}
            </div>
          </div>

          ${footerHtml(bpPageNum, totalDocPages)}
        </div>
      `);
    });

    // FINAL PAGE: Summary Matrix & Roadmap & Guarantees
    pagesHtml.push(`
      <div style="${pageBaseStyle}">
        <div>
          ${headerHtml('Сводная матрица тарифов, дорожная карта и контакты', 'SAV AI Platform 2026')}

          <!-- Summary Matrix -->
          <div style="background: rgba(18, 18, 22, 0.85); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 14px; padding: 14px 18px; margin-bottom: 12px;">
            <div style="font-size: 14px; font-weight: 800; color: #fef08a; margin-bottom: 8px; text-transform: uppercase;">
              Сводная таблица параметров и инвестиций:
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; text-align: left;">
              <thead>
                <tr style="border-bottom: 1.5px solid rgba(245, 158, 11, 0.4); color: #f59e0b;">
                  <th style="padding: 6px 8px;">Тариф</th>
                  <th style="padding: 6px 8px;">В месяц</th>
                  <th style="padding: 6px 8px;">Под ключ</th>
                  <th style="padding: 6px 8px;">Срок</th>
                  <th style="padding: 6px 8px;">Пакет лимитов</th>
                </tr>
              </thead>
              <tbody>
                ${plans.slice(0, 5).map((p, idx) => {
                  const mBase = p.monthlyPrice || p.priceMonth || 10000;
                  const oBase = p.onetimePrice || Math.round(mBase / 0.2);
                  const fM = applyDiscount(mBase);
                  const fO = applyDiscount(oBase);
                  return `
                    <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08); ${idx === 2 ? 'background: rgba(245, 158, 11, 0.1); font-weight: 700;' : ''}">
                      <td style="padding: 6px 8px; color: #fef08a;">${p.package}</td>
                      <td style="padding: 6px 8px; color: #ffffff;">${fM.toLocaleString('ru-RU')} ₽</td>
                      <td style="padding: 6px 8px; color: #ffffff;">${fO.toLocaleString('ru-RU')} ₽</td>
                      <td style="padding: 6px 8px; color: #d4d4d8;">${p.duration || '3-5 дн.'}</td>
                      <td style="padding: 6px 8px; color: #f59e0b;">Обновление 24/7 (10-400 млн токенов: до 5 000 - 200 000 сообщ.)</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Stages -->
          <div style="background: rgba(18, 18, 22, 0.85); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 14px; padding: 14px 18px; margin-bottom: 12px;">
            <div style="font-size: 14px; font-weight: 800; color: #fef08a; margin-bottom: 8px;">5 этапов внедрения проекта:</div>
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 14px; color: #f4f4f5; line-height: 1.4;">
              <div><strong>1. Аудит и сбор материалов:</strong> анализ регламентов и скриптов продаж (1-2 дня).</div>
              <div><strong>2. Проектирование логики:</strong> разработка сценариев квалификации и автодожима (2 дня).</div>
              <div><strong>3. Интеграция систем:</strong> подключение мессенджеров, CRM и баз данных (2-3 дня).</div>
              <div><strong>4. Тестирование и калибровка:</strong> закрытый прогон на реальных кейсах (1 день).</div>
              <div><strong>5. Ввод в эксплуатацию:</strong> предоставление доступов и обучение команды (1 день).</div>
            </div>
          </div>

          <!-- Guarantees & Contacts -->
          <div style="background: rgba(18, 18, 22, 0.95); border: 1.5px solid rgba(245, 158, 11, 0.55); border-radius: 14px; padding: 14px 18px;">
            <div style="font-size: 14px; font-weight: 800; color: #fef08a; margin-bottom: 6px;">Гарантии и контакты для согласования:</div>
            <div style="font-size: 14px; color: #ffffff; line-height: 1.5;">
              <div>• Telegram бот: <strong>@SAV_AIbot</strong></div>
              <div>• Официальный портал: <strong>sav-ai.ru</strong></div>
              <div>• Гарантии: бесперебойная работа 24/7/365, скорость ответа до 2 сек, шифрование баз данных.</div>
            </div>
          </div>
        </div>

        ${footerHtml(totalDocPages, totalDocPages)}
      </div>
    `);
  }

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const totalPagesToRender = pagesHtml.length;
    for (let i = 0; i < totalPagesToRender; i++) {
      if (i > 0) {
        doc.addPage();
      }

      const currentProgress = Math.min(95, Math.round(10 + ((i + 1) / totalPagesToRender) * 80));
      onProgress?.(currentProgress, `Генерация листа ${i + 1} из ${totalPagesToRender}...`);

      container.innerHTML = pagesHtml[i];

      // Render page using html2canvas with 2x scale for high resolution
      const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#09090b',
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);
    }

    onProgress?.(98, 'Сборка и сохранение PDF-документа...');

    const filenameTariff = singlePlan ? `_Тариф_${singlePlan.package}` : '_Все_тарифы';
    const filename = `SAV_AI_Презентация${filenameTariff}_${cleanCompany.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}.pdf`;
    
    // Save to user machine
    doc.save(filename);

    // Upload to local/cloud backend gallery
    try {
      const pdfBase64 = doc.output('datauristring');
      await fetch('/api/v1/ai/calculator/upload-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          filename,
          company: cleanCompany,
          calculationData: {
            presentationType: singlePlan ? 'single_plan' : 'all_plans',
            plan: singlePlan?.package,
            date: new Date().toISOString()
          }
        })
      });
    } catch (upErr) {
      console.warn('[PDF Cloud Gallery Sync Note]', upErr);
    }

    onProgress?.(100, 'Документ успешно сформирован!');
  } finally {
    // Clean up offscreen container
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}


