/**
 * File Storage Service & Cache
 * Retrieves direct cloud URLs and metadata from BD ProTalk `file_storage` database table.
 */

export interface StorageFile {
  id: number;
  file_key: string;
  name: string;
  original_url: string;
  mime_type: string;
  file_size?: number;
  folder_id?: number | null;
  slug?: string;
  short_url?: string;
  full_url?: string;
}

declare global {
  interface Window {
    __SAV_FILE_STORAGE?: StorageFile[];
    __SAV_FILES_MAP?: Record<string, StorageFile>;
    __SAV_MODEL_BLOBS?: Record<string, string>;
    __SAV_VIDEO_BLOBS?: Record<string, string>;
  }
}

let cachedFiles: StorageFile[] | null = null;
let fetchPromise: Promise<StorageFile[]> | null = null;

export async function fetchFileStorage(force = false): Promise<StorageFile[]> {
  if (typeof window !== 'undefined' && window.__SAV_FILE_STORAGE && window.__SAV_FILE_STORAGE.length > 0 && !force) {
    return window.__SAV_FILE_STORAGE;
  }

  if (cachedFiles && !force) {
    return cachedFiles;
  }

  if (fetchPromise && !force) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const res = await fetch('/api/files');
      if (!res.ok) {
        throw new Error(`Failed to fetch file_storage: ${res.status}`);
      }
      const data: StorageFile[] = await res.json();
      cachedFiles = data;

      if (typeof window !== 'undefined') {
        window.__SAV_FILE_STORAGE = data;
        window.__SAV_FILES_MAP = {};
        for (const file of data) {
          window.__SAV_FILES_MAP[String(file.id)] = file;
          window.__SAV_FILES_MAP[file.file_key] = file;
          if (file.slug) window.__SAV_FILES_MAP[file.slug] = file;
          if (file.name) window.__SAV_FILES_MAP[file.name] = file;
        }
      }

      return data;
    } catch (err) {
      console.warn('[FileStorage] Error fetching database files, using cached/fallback registry:', err);
      return cachedFiles || [];
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

/**
 * Synchronous or cached lookup of a file from file_storage
 */
export function getStorageFile(query: number | string): StorageFile | undefined {
  if (typeof window !== 'undefined' && window.__SAV_FILES_MAP) {
    const found = window.__SAV_FILES_MAP[String(query)];
    if (found) return found;
  }

  if (cachedFiles) {
    return cachedFiles.find(
      (f) =>
        f.id === query ||
        f.file_key === query ||
        f.name === query ||
        f.slug === query ||
        f.name.toLowerCase() === String(query).toLowerCase()
    );
  }

  return undefined;
}

/**
 * Returns the direct cloud URL from file_storage in BD ProTalk, falling back to proxy or provided default
 */
export function getDirectFileUrl(query: number | string, fallbackUrl?: string): string {
  const file = getStorageFile(query);
  if (file && file.original_url) {
    return file.original_url;
  }
  if (file && file.short_url) {
    return file.short_url;
  }
  return fallbackUrl || (typeof query === 'number' ? `/file/${query}` : `/file/${query}`);
}
