import fs from 'fs';
import path from 'path';
import { executeQuery } from '../db/database';

/**
 * Extracts clean plain text from documents (PDF, DOCX, TXT, Markdown, etc.)
 * Supports raw buffers, base64 data, local file paths, and remote URLs.
 */
export async function extractTextFromDocPayload(payload: {
  fileBuffer?: Buffer;
  fileBase64?: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  userUid?: string | number;
}): Promise<string> {
  let buffer: Buffer | null = null;
  const fileName = (payload.fileName || '').toLowerCase();
  let mime = (payload.mimeType || '').toLowerCase();

  // 1. If buffer already provided
  if (payload.fileBuffer && Buffer.isBuffer(payload.fileBuffer)) {
    buffer = payload.fileBuffer;
  }

  // 2. Base64
  if (!buffer && payload.fileBase64) {
    try {
      const cleanB64 = payload.fileBase64.replace(/^data:[^;]+;base64,/, '');
      buffer = Buffer.from(cleanB64, 'base64');
    } catch (e) {
      console.warn('[extractTextFromDocPayload] Base64 parse failed:', e);
    }
  }

  // 3. File URL
  if (payload.fileUrl) {
    const fileUrl = payload.fileUrl;

    // Direct ProTalk function 369 text extraction for HTTP / filestore links
    if (fileUrl.startsWith('http')) {
      try {
        const { runProTalkDocRecognitionFunction } = await import('./proTalkService');
        const directRes = await runProTalkDocRecognitionFunction({
          url: fileUrl,
          file_type: fileName.endsWith('.docx') ? 'docx' : (fileName.endsWith('.pdf') ? 'pdf' : undefined),
          userUid: payload.userUid
        });
        if (directRes.success && directRes.text && directRes.text.length > 30) {
          console.log(`[extractTextFromDocPayload] Function 369 direct extraction succeeded (${directRes.text.length} chars)`);
          return directRes.text;
        }
      } catch (f369Err) {
        console.warn('[extractTextFromDocPayload] Function 369 attempt note:', f369Err);
      }
    }

    if (!buffer) {
      if (fileUrl.startsWith('local://')) {
        const localPath = path.resolve(fileUrl.replace('local://', ''));
        if (fs.existsSync(localPath)) {
          buffer = fs.readFileSync(localPath);
        }
      } else if (fileUrl.includes('/file/') || fileUrl.includes('/files/')) {
        const parts = fileUrl.split('/');
        const lastPart = parts[parts.length - 1];
        const row: any = executeQuery(
          'SELECT * FROM file_storage WHERE id = ? OR file_key = ? OR slug = ? OR name = ? LIMIT 1',
          [lastPart, lastPart, lastPart, lastPart]
        )?.[0];
        if (row?.original_url?.startsWith('local://')) {
          const localPath = path.resolve(row.original_url.replace('local://', ''));
          if (fs.existsSync(localPath)) buffer = fs.readFileSync(localPath);
        } else if (row?.original_url?.startsWith('http')) {
          try {
            const resp = await fetch(row.original_url);
            if (resp.ok) buffer = Buffer.from(await resp.arrayBuffer());
          } catch {}
        }
        if (row?.mime_type) mime = row.mime_type.toLowerCase();
      } else if (fileUrl.startsWith('http')) {
        try {
          const resp = await fetch(fileUrl);
          if (resp.ok) {
            buffer = Buffer.from(await resp.arrayBuffer());
            const cType = resp.headers.get('content-type');
            if (cType) mime = cType.toLowerCase();
          }
        } catch {}
      }
    }
  }

  // 4. Check data/uploads or backend/data/uploads by fileName if still no buffer
  if (!buffer && payload.fileName) {
    const candidateDirs = [
      path.join(process.cwd(), 'data', 'uploads'),
      path.join(process.cwd(), 'backend', 'data', 'uploads'),
      path.join(process.cwd(), 'uploads')
    ];
    for (const d of candidateDirs) {
      if (fs.existsSync(d)) {
        const files = fs.readdirSync(d);
        const match = files.find(f => f.toLowerCase().includes(fileName) || (fileName && fileName.includes(f.toLowerCase())));
        if (match) {
          try {
            buffer = fs.readFileSync(path.join(d, match));
            break;
          } catch {}
        }
      }
    }
  }

  if (!buffer || buffer.length === 0) {
    return '';
  }

  const isPdf = fileName.endsWith('.pdf') || mime.includes('pdf');
  const isDocx = fileName.endsWith('.docx') || fileName.endsWith('.doc') || mime.includes('wordprocessingml') || mime.includes('officedocument') || mime.includes('msword');

  // PDF text extraction
  if (isPdf) {
    try {
      const pdfModule: any = await import('pdf-parse');
      const PDFParse = pdfModule.PDFParse || pdfModule.default?.PDFParse || pdfModule.default;
      if (typeof PDFParse === 'function' && PDFParse.prototype?.load) {
        const parser = new PDFParse({ data: buffer });
        await parser.load();
        const textObj = await parser.getText();
        if (textObj?.text && textObj.text.trim()) {
          return textObj.text.trim();
        }
      } else if (typeof pdfModule === 'function') {
        const res = await pdfModule(buffer);
        if (res?.text && res.text.trim()) return res.text.trim();
      } else if (typeof pdfModule.default === 'function') {
        const res = await pdfModule.default(buffer);
        if (res?.text && res.text.trim()) return res.text.trim();
      }
    } catch (pdfErr) {
      console.warn('[extractTextFromDocPayload] PDF parse error:', pdfErr);
    }
  }

  // DOCX text extraction
  if (isDocx) {
    try {
      const mammoth: any = await import('mammoth');
      const extractRawText = mammoth.extractRawText || mammoth.default?.extractRawText;
      if (typeof extractRawText === 'function') {
        const docxRes = await extractRawText({ buffer });
        if (docxRes?.value && docxRes.value.trim()) {
          return docxRes.value.trim();
        }
      }
    } catch (docxErr) {
      console.warn('[extractTextFromDocPayload] DOCX parse error:', docxErr);
    }
  }

  // Plain text / Markdown / JSON fallback
  try {
    const textStr = buffer.toString('utf-8');
    if (!textStr.includes('\u0000')) {
      return textStr.trim();
    }
  } catch {}

  return '';
}
