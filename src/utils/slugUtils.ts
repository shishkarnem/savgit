/**
 * Transliteration map for Russian/Cyrillic to English/Latin URL slugs
 */
const CYRILLIC_TO_LATIN_MAP: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
};

/**
 * Converts any Russian / Unicode product name into a clean, readable transliterated slug.
 * Example: "ИИ Переводчик файлов и юридической документации"
 * -> "ii-perevodchik-failov-i-yuridicheskoy-dokumentatsii"
 */
export function generateProductSlug(name: string): string {
  if (!name || typeof name !== 'string') return 'solution';

  const lower = name.toLowerCase().trim();
  let result = '';

  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i];
    if (CYRILLIC_TO_LATIN_MAP[ch] !== undefined) {
      result += CYRILLIC_TO_LATIN_MAP[ch];
    } else if (/[a-z0-9]/.test(ch)) {
      result += ch;
    } else if (/\s|_|-|\/|\\|\.|,/.test(ch)) {
      if (!result.endsWith('-')) {
        result += '-';
      }
    }
  }

  // Clean trailing and leading hyphens, collapse multiple hyphens
  result = result.replace(/^-+|-+$/g, '').replace(/-+/g, '-');
  return result || 'solution';
}

/**
 * Checks if a given URL slug or ID matches a product (by slug, transliteration, tildaUid, SKU, or id)
 */
export function isProductSlugMatch(product: { id?: string; tildaUid?: string; sku?: string; slug?: string; name?: string; url?: string }, target: string): boolean {
  if (!target || !product) return false;
  const cleanTarget = target.toLowerCase().trim();

  // 1. Direct ID, tildaUid, SKU matches
  if (product.id && product.id.toLowerCase() === cleanTarget) return true;
  if (product.tildaUid && product.tildaUid.toLowerCase() === cleanTarget) return true;
  if (product.sku && product.sku.toLowerCase() === cleanTarget) return true;

  // 2. Exact slug match
  if (product.slug && product.slug.toLowerCase() === cleanTarget) return true;

  // 3. Generated transliterated slug match
  if (product.name) {
    const genSlug = generateProductSlug(product.name);
    if (genSlug === cleanTarget) return true;
    if (cleanTarget.startsWith(genSlug) || genSlug.startsWith(cleanTarget)) return true;
    
    // Check normalized comparison (ignoring 'e' vs 'yo', vowels variance)
    const normGen = genSlug.replace(/[^a-z0-9]/g, '');
    const normTarget = cleanTarget.replace(/[^a-z0-9]/g, '');
    if (normGen && normTarget && (normGen.includes(normTarget) || normTarget.includes(normGen))) {
      return true;
    }
  }

  // 4. URL substring match
  if (product.url && product.url.toLowerCase().includes(cleanTarget)) return true;

  return false;
}
