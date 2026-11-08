import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { getAll, getOne, runSql, saveDb } from '../db/database';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB
});

const DEFAULT_PROTALK_TOKEN = "b2RdUnRrWlFha1h3GHMhU2Y5GCsuGxAULisQKl0tNCo3BTJ4FSNQGCwLFxRuPRQYaGtdWGtjUgVvAH9YAmk";
const UPLOAD_URL = "https://file.pro-talk.ru/tgf";

/**
 * Корректное декодирование кириллицы из multipart/form-data заголовков,
 * которые парсер multer по умолчанию читает как latin-1 (ISO-8859-1).
 * Восстанавливает правильный русский UTF-8 текст (например: "РентРОП.pdf").
 */
export function fixUtf8String(str: string): string {
  if (!str) return '';
  try {
    const converted = Buffer.from(str, 'latin1').toString('utf8');
    if (/[а-яА-ЯёЁ]/.test(converted) && !converted.includes('\uFFFD')) {
      return converted;
    }
  } catch {}
  return str;
}

/**
 * Транслитерация кириллицы в латиницу с заменой пробелов и спецсимволов на дефисы
 * Пример: "РентРОП.pdf" -> "rentrop.pdf"
 */
export function transliterateFilename(originalName: string): string {
  if (!originalName) return 'file.png';

  const cyrMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
    'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
    'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch',
    'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
  };

  const fixedName = fixUtf8String(originalName);
  const lastDot = fixedName.lastIndexOf('.');
  const base = lastDot !== -1 ? fixedName.slice(0, lastDot) : fixedName;
  const ext = lastDot !== -1 ? fixedName.slice(lastDot).toLowerCase() : '';

  let transliterated = base
    .split('')
    .map(ch => cyrMap[ch] !== undefined ? cyrMap[ch] : ch)
    .join('')
    .toLowerCase();

  // Заменяем пробелы, подчеркивания и любые не-буквенно-цифровые символы на один дефис
  transliterated = transliterated.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!transliterated) transliterated = 'file';

  return `${transliterated}${ext}`;
}

/**
 * Формирование правильного и уникального slug файла в таблице file_storage.
 * Если файл с таким slug уже существует, добавляется суффикс: rentrop-1.pdf, rentrop-2.pdf и т.д.
 */
export async function generateUniqueSlug(originalName: string, excludeId?: number): Promise<string> {
  const baseSlug = transliterateFilename(originalName);
  const lastDot = baseSlug.lastIndexOf('.');
  const namePart = lastDot !== -1 ? baseSlug.slice(0, lastDot) : baseSlug;
  const extPart = lastDot !== -1 ? baseSlug.slice(lastDot) : '';

  let candidate = baseSlug;
  let counter = 1;

  while (true) {
    let query = 'SELECT id FROM file_storage WHERE slug = ?';
    const params: any[] = [candidate];
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    const existing = await getOne(query, params);
    if (!existing) {
      return candidate;
    }
    candidate = `${namePart}-${counter}${extPart}`;
    counter++;
  }
}

/**
 * Определяет ID папки по умолчанию для файла, если он не указан явно.
 * Документы (PDF, DOCX, TXT и др.) автоматически попадают в папку 5 («Документы и ТЗ»).
 */
export function detectDefaultFolderId(fileName: string, mimeType?: string, currentFolderId?: any): number | null {
  if (currentFolderId && currentFolderId !== 'all') {
    const num = Number(currentFolderId);
    if (!isNaN(num) && num > 0) return num;
  }
  const lower = (fileName || '').toLowerCase();
  const lowerMime = (mimeType || '').toLowerCase();
  if (
    lower.endsWith('.pdf') || lower.endsWith('.docx') || lower.endsWith('.doc') ||
    lower.endsWith('.txt') || lower.endsWith('.rtf') || lower.endsWith('.odt') ||
    lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv') ||
    lowerMime.includes('pdf') || lowerMime.includes('word') || lowerMime.includes('document') ||
    lowerMime.includes('text/plain')
  ) {
    return 5; // Папка «Документы и ТЗ»
  }
  if (lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.endsWith('.ogg') || lowerMime.includes('audio')) {
    return 3; // Папка «Голосовые»
  }
  if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lowerMime.includes('video')) {
    return 4; // Папка «Фоны и баннеры»
  }
  if (lower.includes('logo') || lower.includes('brand')) {
    return 2; // Папка «Логотипы и брендинг»
  }
  return null;
}

export function getOrigin(req: Request): string {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = (typeof forwardedProto === 'string' ? forwardedProto.split(',')[0].trim() : (Array.isArray(forwardedProto) ? forwardedProto[0] : req.protocol)) || 'https';
  const forwardedHost = req.headers['x-forwarded-host'];
  const host = (typeof forwardedHost === 'string' ? forwardedHost.split(',')[0].trim() : (Array.isArray(forwardedHost) ? forwardedHost[0] : req.get('host'))) || 'localhost:3000';
  return `${proto}://${host}`;
}

// 1. Короткая ссылка проксирования: /file/:id, /files/:id, /file/:id/:slug, /files/:id/:slug
// Поддерживает обращение как /files/13/test-logo.png, так и /files/13 или /file/aB3xZ9mQ/test-logo.png
router.get(['/file/:id', '/file/:id/:slug', '/files/:id', '/files/:id/:slug'], async (req: Request, res: Response) => {
  try {
    const param = req.params.id;
    let file: any = null;

    if (/^\d+$/.test(param)) {
      file = await getOne('SELECT * FROM file_storage WHERE id = ?', [parseInt(param, 10)]);
    }
    if (!file) {
      file = await getOne('SELECT * FROM file_storage WHERE file_key = ?', [param]);
    }
    if (!file) {
      file = await getOne('SELECT * FROM file_storage WHERE slug = ?', [param]);
    }

    if (!file || !file.original_url) {
      return res.status(404).send('File not found');
    }

    // Определение MIME-типа
    let contentType = file.mime_type || 'application/octet-stream';
    if (file.name?.endsWith('.glb') || file.slug?.endsWith('.glb')) {
      contentType = 'model/gltf-binary';
    } else if (file.name?.endsWith('.mp4') || file.slug?.endsWith('.mp4')) {
      contentType = 'video/mp4';
    } else if (file.name?.endsWith('.png') || file.slug?.endsWith('.png')) {
      contentType = 'image/png';
    } else if (file.name?.endsWith('.jpg') || file.name?.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (file.name?.endsWith('.webp')) {
      contentType = 'image/webp';
    }

    // 0. Если ссылка в облаке (хранилище ProTalk/облако), отдаем прямой редирект (302) на облачный URL
    if (file.original_url.startsWith('http://') || file.original_url.startsWith('https://')) {
      let targetUrl = file.original_url;
      if (targetUrl.startsWith('https://filestore.pro-talk.ru/')) {
        const fileTail = targetUrl.replace('https://filestore.pro-talk.ru/', '');
        targetUrl = `https://file.pro-talk.ru/tgf/${fileTail}`;
      }
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.redirect(302, targetUrl);
    }

    // 1. Если файл сохранен локально (fallback при сбое внешнего хранилища)
    if (file.original_url.startsWith('local://')) {
      const localFilePath = path.resolve(file.original_url.replace('local://', ''));
      if (fs.existsSync(localFilePath)) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Accept-Ranges', 'bytes');
        return res.sendFile(localFilePath);
      }
    }

    return res.status(404).send('File not found');
  } catch (err: any) {
    console.error('[File Route Error]', err);
    res.status(500).send('Internal server error');
  }
});


// 2. Получение списка файлов с фильтрацией, вычислением коротких ссылок /file/:id/slug и прямыми ссылками original_url
router.get(['/api/files', '/api/admin/files'], async (req: Request, res: Response) => {
  try {
    const { folder_id, search } = req.query;
    let query = `
      SELECT f.*, fl.name as folder_name, fl.color as folder_color 
      FROM file_storage f 
      LEFT JOIN file_folders fl ON f.folder_id = fl.id
    `;
    const params: any[] = [];

    const conditions: string[] = [];
    if (folder_id === 'null' || folder_id === 'root') {
      conditions.push('f.folder_id IS NULL');
    } else if (folder_id && folder_id !== 'all') {
      conditions.push('f.folder_id = ?');
      params.push(Number(folder_id));
    }

    if (search) {
      conditions.push('(f.name LIKE ? OR f.file_key LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY f.id DESC';

    const files = await getAll(query, params);
    const origin = getOrigin(req);

    // Дополняем каждый файл вычисленной короткой и полной ссылкой с поддержкой текущего домена
    const enrichedFiles = files.map((f: any) => {
      const slug = f.slug || transliterateFilename(f.name);
      return {
        ...f,
        slug,
        short_url: `/file/${f.id}/${slug}`,
        short_key_url: `/file/${f.file_key}/${slug}`,
        full_url: `${origin}/file/${f.id}/${slug}`,
        full_key_url: `${origin}/file/${f.file_key}/${slug}`
      };
    });

    res.json(enrichedFiles);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// 3. Серверная загрузка файла с поддержкой альфа-прозрачности (X-Preserve-Alpha)
router.post(['/api/admin/files/upload', '/api/files/upload'], upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { folder_id, token, custom_name } = req.body;
    const uploadToken = token || DEFAULT_PROTALK_TOKEN;
    const rawName = custom_name || req.file.originalname || 'file.dat';
    const fileName = fixUtf8String(rawName);
    const mimeType = req.file.mimetype || 'application/octet-stream';
    const effectiveFolderId = detectDefaultFolderId(fileName, mimeType, folder_id);
    const slug = await generateUniqueSlug(fileName);

    // Генерация уникального 8-значного ключа для плейсхолдера {{fileKey}}
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let fileKey = '';
    for (let i = 0; i < 8; i++) fileKey += chars.charAt(Math.floor(Math.random() * chars.length));

    // Надежное сохранение файла в локальное хранилище data/uploads
    const uploadsDir = path.join(process.cwd(), 'data', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const localFileName = `${fileKey}_${slug}`;
    const localFilePath = path.join(uploadsDir, localFileName);
    fs.writeFileSync(localFilePath, req.file.buffer);

    // Подготавливаем FormData для отправки в ProTalk / FileStore с сохранением альфа-канала
    const formData = new FormData();
    const fileBlob = new Blob([req.file.buffer], { type: mimeType });
    formData.append('file', fileBlob, fileName);

    const uploadHeaders: Record<string, string> = {
      'X-Upload-Token': uploadToken,
      'X-Preserve-Alpha': 'true' // Сохранение прозрачности PNG
    };

    let remoteUrl = '';

    // 1. Приоритетная загрузка на рабочий шлюз file.pro-talk.ru/tgf
    try {
      const ctrl = new AbortController();
      const tId = setTimeout(() => ctrl.abort(), 30000);
      const resp = await fetch(UPLOAD_URL, {
        method: 'POST',
        headers: uploadHeaders,
        body: formData,
        signal: ctrl.signal
      });
      clearTimeout(tId);

      if (resp.ok) {
        const text = await resp.text();
        if (text.startsWith('http://') || text.startsWith('https://')) {
          remoteUrl = text.trim();
        } else {
          try {
            const data = JSON.parse(text);
            remoteUrl = data.url || data.file_url || data.link || '';
          } catch {}
        }
      }
    } catch (primaryErr: any) {
      if (primaryErr?.name === 'AbortError') {
        console.warn('[Gallery] Primary upload endpoint timed out (30s)');
      } else {
        console.warn('[Gallery] Primary upload endpoint warning:', primaryErr);
      }
    }



    // 3. Если удаленное хранилище вернуло ошибку или недоступно, используем гарантированное локальное хранение
    if (!remoteUrl) {
      remoteUrl = `local://${localFilePath}`;
    }

    // Сохранение в BD ProTalk с правильным именем, уникальным slug и папкой
    await runSql(
      `INSERT INTO file_storage (file_key, name, slug, original_url, mime_type, file_size, folder_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        fileKey,
        fileName,
        slug,
        remoteUrl,
        mimeType,
        req.file.size,
        effectiveFolderId
      ]
    );

    saveDb();

    const created = await getOne('SELECT * FROM file_storage WHERE file_key = ?', [fileKey]);
    const origin = getOrigin(req);
    const enriched = {
      ...created,
      slug,
      direct_url: remoteUrl,
      proxy_url: `/file/${created.id}/${slug}`,
      short_url: `/file/${created.id}/${slug}`,
      short_key_url: `/file/${created.file_key}/${slug}`,
      full_url: `${origin}/file/${created.id}/${slug}`,
      full_key_url: `${origin}/file/${created.file_key}/${slug}`
    };

    res.json({ success: true, file: enriched });
  } catch (err: any) {
    console.error('[Gallery Upload Error]', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// 4. Загрузка по внешнему URL
router.post('/api/admin/files/upload-url', async (req: Request, res: Response) => {
  try {
    const { url, folder_id, token, name } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const uploadToken = token || DEFAULT_PROTALK_TOKEN;

    // Скачиваем файл по URL
    const fileRes = await fetch(url);
    if (!fileRes.ok) throw new Error(`Не удалось скачать файл по URL: HTTP ${fileRes.status}`);

    const buffer = Buffer.from(await fileRes.arrayBuffer());
    const contentType = fileRes.headers.get('content-type') || 'image/png';
    const rawName = name || url.split('/').pop()?.split('?')[0] || 'remote_file.png';
    const detectedName = fixUtf8String(rawName);
    const effectiveFolderId = detectDefaultFolderId(detectedName, contentType, folder_id);
    const slug = await generateUniqueSlug(detectedName);

    // Загружаем в ProTalk через рабочий шлюз UPLOAD_URL
    const formData = new FormData();
    const blob = new Blob([buffer], { type: contentType });
    formData.append('file', blob, detectedName);

    let remoteUrl = '';
    try {
      const resp = await fetch(UPLOAD_URL, {
        method: 'POST',
        headers: {
          'X-Upload-Token': uploadToken,
          'X-Preserve-Alpha': 'true'
        },
        body: formData
      });

      if (resp.ok) {
        const text = await resp.text();
        if (text.startsWith('http://') || text.startsWith('https://')) {
          remoteUrl = text.trim();
        } else {
          try {
            const data = JSON.parse(text);
            remoteUrl = data?.url || data?.file_url || '';
          } catch {}
        }
      }
    } catch (e) {
      console.warn('[upload-url] primary gateway note:', e);
    }



    if (!remoteUrl) {
      remoteUrl = url; // fallback to source URL
    }

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let fileKey = '';
    for (let i = 0; i < 8; i++) fileKey += chars.charAt(Math.floor(Math.random() * chars.length));

    await runSql(
      `INSERT INTO file_storage (file_key, name, slug, original_url, mime_type, file_size, folder_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        fileKey,
        detectedName,
        slug,
        remoteUrl,
        contentType,
        buffer.length,
        effectiveFolderId
      ]
    );

    saveDb();

    const created = await getOne('SELECT * FROM file_storage WHERE file_key = ?', [fileKey]);
    const origin = getOrigin(req);
    const enriched = {
      ...created,
      slug,
      direct_url: remoteUrl,
      proxy_url: `/file/${created.id}/${slug}`,
      short_url: `/file/${created.id}/${slug}`,
      short_key_url: `/file/${created.file_key}/${slug}`,
      full_url: `${origin}/file/${created.id}/${slug}`,
      full_key_url: `${origin}/file/${created.file_key}/${slug}`
    };

    res.json({ success: true, file: enriched });
  } catch (err: any) {
    console.error('[Gallery URL Upload Error]', err);
    res.status(500).json({ error: err.message || 'URL Upload failed' });
  }
});

// 5. Регистрация уже загруженного URL (для обратной совместимости)
router.post('/api/admin/files/register', async (req: Request, res: Response) => {
  try {
    const { name, original_url, mime_type, file_size, folder_id } = req.body;
    const fileName = fixUtf8String(name || 'Без названия');
    const effectiveFolderId = detectDefaultFolderId(fileName, mime_type, folder_id);
    const slug = await generateUniqueSlug(fileName);
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let fileKey = '';
    for (let i = 0; i < 8; i++) fileKey += chars.charAt(Math.floor(Math.random() * chars.length));

    await runSql(
      `INSERT INTO file_storage (file_key, name, slug, original_url, mime_type, file_size, folder_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [fileKey, fileName, slug, original_url, mime_type || 'image/png', file_size || 0, effectiveFolderId]
    );

    saveDb();

    const created = await getOne('SELECT * FROM file_storage WHERE file_key = ?', [fileKey]);
    const origin = getOrigin(req);
    const enriched = {
      ...created,
      slug,
      direct_url: original_url,
      proxy_url: `/file/${created.id}/${slug}`,
      short_url: `/file/${created.id}/${slug}`,
      short_key_url: `/file/${created.file_key}/${slug}`,
      full_url: `${origin}/file/${created.id}/${slug}`,
      full_key_url: `${origin}/file/${created.file_key}/${slug}`
    };
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// 6. Перемещение файла в папку
router.patch('/api/admin/files/:id/move', async (req: Request, res: Response) => {
  try {
    const { folder_id } = req.body;
    await runSql('UPDATE file_storage SET folder_id = ? WHERE id = ?', [folder_id ? Number(folder_id) : null, req.params.id]);
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// 6b. Замена файла / повторная загрузка с сохранением имени, slug и прямой адресной ссылки
router.post('/api/admin/files/:id/replace', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const fileId = req.params.id;
    if (!req.file) {
      return res.status(400).json({ error: 'Файл для замены не прикреплен' });
    }

    const existingFile = await getOne('SELECT * FROM file_storage WHERE id = ?', [fileId]);
    if (!existingFile) {
      return res.status(404).json({ error: 'Файл не найден в базе данных' });
    }

    const uploadToken = (req.body && req.body.token) || DEFAULT_PROTALK_TOKEN;
    const existingName = existingFile.name; // Сохраняем прежнее название
    const existingSlug = existingFile.slug; // Сохраняем прежний slug и прямую адресную ссылку
    const mimeType = req.file.mimetype || 'application/octet-stream';
    const fileSize = req.file.size;

    // Обновляем локальную копию в data/uploads
    const uploadsDir = path.join(process.cwd(), 'data', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const localFileName = `${existingFile.file_key}_${existingSlug}`;
    const localFilePath = path.join(uploadsDir, localFileName);
    fs.writeFileSync(localFilePath, req.file.buffer);



    // Загружаем новый файл в ProTalk через рабочий шлюз UPLOAD_URL
    const formData = new FormData();
    const fileBlob = new Blob([req.file.buffer], { type: mimeType });
    formData.append('file', fileBlob, existingName);

    const uploadHeaders: Record<string, string> = {
      'X-Upload-Token': uploadToken,
      'X-Preserve-Alpha': 'true'
    };

    let remoteUrl = '';

    // Приоритетная попытка 1: file.pro-talk.ru/tgf (основной рабочий шлюз)
    try {
      const ctrl = new AbortController();
      const tId = setTimeout(() => ctrl.abort(), 30000);
      const resp = await fetch(UPLOAD_URL, {
        method: 'POST',
        headers: uploadHeaders,
        body: formData,
        signal: ctrl.signal
      });
      clearTimeout(tId);

      if (resp.ok) {
        const text = await resp.text();
        if (text.startsWith('http://') || text.startsWith('https://')) {
          remoteUrl = text.trim();
        } else {
          try {
            const data = JSON.parse(text);
            remoteUrl = data.url || data.file_url || data.link || '';
          } catch {}
        }
      }
    } catch (primaryErr: any) {
      if (primaryErr?.name === 'AbortError') {
        console.warn('[Gallery Replace] Primary upload endpoint timed out (30s)');
      } else {
        console.warn('[Gallery Replace] Primary upload warning:', primaryErr);
      }
    }



    // Если удаленное хранилище временно недоступно, используем локальный адрес
    if (!remoteUrl) {
      remoteUrl = `local://${localFilePath}`;
    }

    // Обновляем запись в базе file_storage: сохраняем name и slug, меняем original_url, mime_type, file_size
    await runSql(
      `UPDATE file_storage 
       SET original_url = ?, mime_type = ?, file_size = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [remoteUrl, mimeType, fileSize, fileId]
    );

    saveDb();

    const updated = await getOne('SELECT * FROM file_storage WHERE id = ?', [fileId]);
    const origin = getOrigin(req);
    const nowTs = Date.now();
    const enriched = {
      ...updated,
      slug: existingSlug,
      direct_url: remoteUrl,
      proxy_url: `/file/${updated.id}/${existingSlug}`,
      short_url: `/file/${updated.id}/${existingSlug}`,
      short_key_url: `/file/${updated.file_key}/${existingSlug}`,
      full_url: `${origin}/file/${updated.id}/${existingSlug}`,
      full_key_url: `${origin}/file/${updated.file_key}/${existingSlug}`,
      _v: nowTs,
      cache_buster: nowTs
    };

    res.json({ 
      success: true, 
      file: enriched, 
      message: 'Файл успешно заменен, прямая ссылка и название сохранены, original_url обновлен' 
    });
  } catch (err: any) {
    console.error('[Gallery File Replace Error]', err);
    res.status(500).json({ error: err.message || 'Ошибка замены файла' });
  }
});

// 7. Удаление файла из базы
router.delete('/api/admin/files/:id', async (req: Request, res: Response) => {
  try {
    await runSql('DELETE FROM file_storage WHERE id = ?', [req.params.id]);
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// 8. Управление папками
router.get('/api/admin/file-folders', async (req: Request, res: Response) => {
  try {
    const folders = await getAll(`
      SELECT fl.*, COUNT(f.id) as file_count
      FROM file_folders fl
      LEFT JOIN file_storage f ON fl.id = f.folder_id
      GROUP BY fl.id
      ORDER BY fl.name ASC
    `);
    res.json(folders);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post('/api/admin/file-folders', async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Folder name is required' });
    await runSql('INSERT INTO file_folders (name, color) VALUES (?, ?)', [name, color || '#f59e0b']);
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete('/api/admin/file-folders/:id', async (req: Request, res: Response) => {
  try {
    const folderId = req.params.id;
    await runSql('UPDATE file_storage SET folder_id = NULL WHERE folder_id = ?', [folderId]);
    await runSql('DELETE FROM file_folders WHERE id = ?', [folderId]);
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
