/**
 * Универсальный хелпер для формирования коротких и полных ссылок на файлы
 * с автоматической поддержкой текущего домена (sav-bot.ru, sav-ai.ru и др.)
 */

export function getCurrentOrigin(): string {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return '';
}

/**
 * Получить относительную короткую ссылку на файл
 * @example getFileUrl(5, 'robot-full-opt.glb') => '/file/5/robot-full-opt.glb'
 */
export function getFileUrl(idOrKey: number | string, slug?: string): string {
  if (!idOrKey) return '';
  if (typeof idOrKey === 'string' && (idOrKey.startsWith('http://') || idOrKey.startsWith('https://') || idOrKey.startsWith('/'))) {
    return idOrKey;
  }
  if (slug) {
    return `/file/${idOrKey}/${slug}`;
  }
  return `/file/${idOrKey}`;
}

/**
 * Получить абсолютную короткую ссылку на файл с учетом текущего домена
 * @example getFullFileUrl(5, 'robot-full-opt.glb') => 'https://sav-bot.ru/file/5/robot-full-opt.glb'
 */
export function getFullFileUrl(idOrKey: number | string, slug?: string): string {
  const rel = getFileUrl(idOrKey, slug);
  if (!rel) return '';
  if (rel.startsWith('http://') || rel.startsWith('https://')) {
    return rel;
  }
  const origin = getCurrentOrigin();
  return origin ? `${origin}${rel}` : rel;
}
