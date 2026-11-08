import https from 'https';
import http from 'http';

export function safeParseJson(val: any, fallback: any = []): any {
  if (!val) return fallback;
  if (Array.isArray(val) || (typeof val === 'object' && val !== null)) return val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return fallback;
    try {
      return JSON.parse(trimmed);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/**
 * Fetch URL content securely with redirects and browser User-Agent
 */
export function fetchUrlText(urlStr: string, maxRedirects = 5): Promise<string> {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'));

    const parsed = new URL(urlStr);
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.get(urlStr, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/csv,text/plain,application/xhtml+xml,text/html;q=0.9,*/*;q=0.8'
      }
    }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
        }
        return fetchUrlText(redirectUrl, maxRedirects - 1).then(resolve).catch(reject);
      }

      if (res.statusCode && res.statusCode >= 400) {
        return reject(new Error(`HTTP error ${res.statusCode}`));
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout fetching sheet'));
    });
  });
}

/**
 * Cleanly sanitize tab raw content removing info|#|...|#| tags
 */
export function sanitizeTabString(raw: string, defaultName: string = 'Описание'): { title: string; content: string } {
  if (!raw) return { title: defaultName, content: '' };
  let content = raw.trim();
  let title = defaultName;

  const infoMatch = content.match(/^info\|#\|([^|#]+)\|#\|([\s\S]*)$/i);
  if (infoMatch) {
    title = infoMatch[1].trim();
    content = infoMatch[2].trim();
  }

  // Strip any leftover info|#|...|#| tags from both content and title
  content = content.replace(/info\|#\|[^|#]+\|#\|/gi, '').trim();
  title = title.replace(/info\|#\|/gi, '').replace(/\|#\|/gi, '').trim();

  // Normalize standard tab titles
  if (/^тариф/i.test(title)) title = 'Тарифы и возможности';
  else if (/^описан/i.test(title)) title = 'Описание и функционал';
  else if (/^опци/i.test(title)) title = 'Опции и интеграции';

  return { title: title || defaultName, content };
}

/**
 * RFC 4180 compliant CSV parser with quote handling and delimiter auto-detection
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  const firstLine = text.split(/\r?\n/)[0] || '';
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  let delimiter = ',';
  if (tabCount > semicolonCount && tabCount > commaCount) {
    delimiter = '\t';
  } else if (semicolonCount >= commaCount && semicolonCount > 0) {
    delimiter = ';';
  } else {
    delimiter = ',';
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentCell.trim().replace(/^"|"$/g, ''));
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentCell.trim().replace(/^"|"$/g, ''));
      currentCell = '';
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim().replace(/^"|"$/g, ''));
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export const CYR_TO_LAT: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
};
