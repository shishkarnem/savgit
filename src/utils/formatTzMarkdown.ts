/**
 * Removes page breaks, details/summary tags, and trailing punctuation from Technical Assignment
 */
export function cleanTzTextWithoutPageBreaks(rawTz: string): string {
  if (!rawTz) return '';
  let text = String(rawTz).trim();

  // 1. Remove details and summary tags from any previous wraps
  text = text.replace(/<\/?details[^>]*>/gi, '');
  text = text.replace(/<\/?summary[^>]*>/gi, '');

  // 2. Remove form feed and page break markers
  text = text.replace(/\f/g, '\n');
  text = text.replace(/<!--\s*page\s*break\s*-->/gi, '');
  text = text.replace(/<div[^>]*page-break[^>]*>[\s\S]*?<\/div>/gi, '');
  text = text.replace(/<br[^>]*page-break[^>]*\/?>/gi, '');
  text = text.replace(/\[\s*Разрыв\s+страницы\s*\]/gi, '');
  text = text.replace(/^[-—_]{3,}\s*(?:Разрыв\s+страницы)?\s*[-—_]{3,}$/gim, '');

  // 3. Remove standalone markdown horizontal rules that function as page breaks
  text = text.replace(/^(?:\s*[-*_]\s*){3,}$/gm, '');

  // 4. Remove accidental trailing punctuation in titles or bullet ends
  text = text.replace(/([;\,])\s*$/gm, '');

  // 5. Normalize quotes and lists
  text = text.replace(/^\|\s*\*\*?(.*?)\*\*?_?$/gm, '> **$1**');
  text = text.replace(/^\|\s*(.*?)$/gm, '> $1');
  text = text.replace(/^•\s*/gm, '- ');

  // 6. Normalize consecutive blank lines
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

/**
 * Backward compatibility: clean TZ without adding any details tags to the UI/storage
 */
export function wrapTzInCollapsibleMarkdown(rawTz: string): string {
  return cleanTzTextWithoutPageBreaks(rawTz);
}
