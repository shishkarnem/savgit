/**
 * Utility functions for text processing, list splitting, and formatting.
 */

/**
 * Splits a text that contains numbered list items into an array of clean string items.
 * Example:
 * "1. Консультация... 2. Расчет цены... 3. Отправка заявки..."
 * =>
 * [
 *   "1. Консультация по нескольким базам знаний и продуктам, создание скрипта продаж.",
 *   "2. Расчет цены по калькулятору, создание калькулятора.",
 *   "3. Отправка заявки в телеграм, в срм, в чат или в таблицу, настройка срм и таблиц статистики.",
 *   ...
 * ]
 */
export function splitNumberedList(text: string | string[] | null | undefined, keepNumbers: boolean = true): string[] {
  if (!text) return [];
  if (Array.isArray(text)) {
    return text.flatMap(item => splitNumberedList(item, keepNumbers)).filter(Boolean);
  }
  if (typeof text !== 'string') return [];
  const trimmed = text.trim();
  if (!trimmed) return [];

  // If already a JSON array string
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.flatMap((item: any) => splitNumberedList(String(item), keepNumbers));
      }
    } catch {}
  }

  // Check if text has numbered items like "1. ", " 2. ", "\n3. "
  if (/(?:^|\s+|\n+)\d+\.\s+/.test(trimmed)) {
    const rawParts = trimmed
      .split(/(?:^|\s+|\n+)(?=\d+\.\s+)/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (rawParts.length > 1 || (rawParts.length === 1 && /^\d+\.\s+/.test(rawParts[0]))) {
      return rawParts.map(part => {
        const cleaned = part.trim();
        if (keepNumbers) {
          return cleaned;
        }
        return cleaned.replace(/^\d+\.\s*/, '').trim();
      }).filter(Boolean);
    }
  }

  // If text contains newlines
  if (trimmed.includes('\n')) {
    const lines = trimmed
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
    if (lines.length > 1) {
      return lines;
    }
  }

  // If text contains semicolons
  if (trimmed.includes(';') && trimmed.split(';').length >= 3) {
    return trimmed
      .split(';')
      .map(s => s.trim())
      .filter(Boolean);
  }

  return [trimmed];
}

/**
 * Cleanly strips leading item numbers (e.g. "1. ", "2. ") from a bullet item string if needed
 */
export function stripItemNumber(item: string): string {
  if (!item || typeof item !== 'string') return '';
  return item.replace(/^\d+\.\s*/, '').trim();
}
