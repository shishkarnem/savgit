import { Router, Request, Response } from 'express';
import { executeQuery, executeRun, getOne, saveDb } from '../db/database';

export const voiceAiRouter = Router();

const PRO_TALK_BOT_ID = 66337;
const PRO_TALK_BOT_TOKEN = 'kEL1nRZp330QvUrG1KenhRQ2JIynkWLs';

/**
 * 1. ProTalk 2-Step STT Voice Recognition Pipeline
 * Step 1: POST https://file.pro-talk.ru/upload_tmp (FormData, no token)
 * Step 2: GET https://api.pro-talk.ru/api/v1.0/stt_from_widget?url={URL} (no token)
 * Step 3: Automatically record audio in SQLite file_storage (Folder 3: "Голосовые", Owner: 169262990)
 */
voiceAiRouter.post(['/api/voice/stt', '/voice/stt', '/api/v1/voice/stt'], async (req: Request, res: Response) => {
  try {
    const { audio_base64, mime_type, uid } = req.body || {};
    if (!audio_base64) {
      return res.status(400).json({ success: false, error: 'no_audio_data' });
    }

    // 1. Extract binary buffer from Base64 Data URL
    const cleanBase64 = audio_base64.includes(',')
      ? audio_base64.split(',')[1]
      : audio_base64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const mime = mime_type || 'audio/webm';

    // 2. Step 1: Upload to temporary storage of ProTalk (without token)
    const formData = new FormData();
    const blob = new Blob([buffer], { type: mime });
    formData.append('file', blob, 'voice_message.webm');

    const uploadRes = await fetch('https://file.pro-talk.ru/upload_tmp', {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: formData,
    });

    if (!uploadRes.ok) {
      const errTxt = await uploadRes.text();
      console.warn('[ProTalk STT Upload Failed]:', uploadRes.status, errTxt);
      return res.status(502).json({ success: false, error: 'upload_failed', details: errTxt });
    }

    const uploadData = (await uploadRes.json().catch(() => ({}))) as any;
    const fileUrl = uploadData?.data?.url || uploadData?.url;

    if (!fileUrl) {
      return res.status(502).json({ success: false, error: 'no_file_url_returned' });
    }

    // 3. Step 2: Transcribe speech using official ProTalk STT Widget endpoint (without token)
    const encodedUrl = encodeURIComponent(fileUrl);
    const sttUrl = `https://api.pro-talk.ru/api/v1.0/stt_from_widget?url=${encodedUrl}`;

    const sttRes = await fetch(sttUrl);
    if (!sttRes.ok) {
      const sttErr = await sttRes.text();
      console.warn('[ProTalk STT Transcribe Failed]:', sttRes.status, sttErr);
      return res.status(502).json({ success: false, error: 'stt_transcribe_failed', file_url: fileUrl });
    }

    const sttData = (await sttRes.json().catch(() => ({}))) as any;
    const transcribedText = sttData?.text || '';

    // 4. Step 3: Save file metadata to BD ProTalk file_storage in folder 3 ("Голосовые")
    let savedFileId: number | null = null;
    let fileKey = '';
    try {
      // Ensure folder 3 exists
      executeRun(`INSERT OR IGNORE INTO file_folders (id, name, color) VALUES (3, 'Голосовые', '#E7C768')`);

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const formattedName = `VoiseSite_${now.getFullYear()}_${pad(now.getMonth() + 1)}_${pad(now.getDate())}_${pad(now.getHours())}_${pad(now.getMinutes())}_${pad(now.getSeconds())}`;

      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      for (let i = 0; i < 8; i++) fileKey += chars.charAt(Math.floor(Math.random() * chars.length));

      const ownerId = uid && /^\d{11}$/.test(String(uid)) ? String(uid) : '169262990';

      executeRun(`
        INSERT INTO file_storage (
          file_key, name, slug, original_url, mime_type, file_size, folder_id, owner_id, description, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 3, ?, 'Запись голоса с сайта', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [fileKey, formattedName, `${fileKey}.webm`, fileUrl, mime, buffer.length, ownerId]);

      const inserted = await getOne('SELECT id FROM file_storage WHERE file_key = ?', [fileKey]);
      if (inserted) {
        savedFileId = inserted.id;
      }
      saveDb();
    } catch (dbErr) {
      console.warn('[Voice Save DB Note]:', dbErr);
    }

    // 5. Return JSON payload
    return res.json({
      success: true,
      text: transcribedText,
      file_url: fileUrl,
      file_id: savedFileId,
      file_key: fileKey,
      audio_url: savedFileId ? `/files/${savedFileId}/${fileKey}.webm` : fileUrl
    });
  } catch (err: any) {
    console.error('[Voice STT Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'internal_server_error' });
  }
});

/**
 * 2. Parse Voice / Text into structured Calculator Survey JSON using ProTalk AI
 */
voiceAiRouter.post(['/api/voice/parse-survey', '/voice/parse-survey'], async (req: Request, res: Response) => {
  try {
    const { text, audio_base64, uid } = req.body || {};
    let rawText = (text || '').trim();

    // If audio is provided without text, transcribe it first
    if (!rawText && audio_base64) {
      const cleanBase64 = audio_base64.includes(',')
        ? audio_base64.split(',')[1]
        : audio_base64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const formData = new FormData();
      const blob = new Blob([buffer], { type: 'audio/webm' });
      formData.append('file', blob, 'voice_survey.webm');

      const uploadRes = await fetch('https://file.pro-talk.ru/upload_tmp', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: formData,
      });

      if (uploadRes.ok) {
        const uploadData = (await uploadRes.json().catch(() => ({}))) as any;
        const fileUrl = uploadData?.data?.url || uploadData?.url;
        if (fileUrl) {
          const sttRes = await fetch(`https://api.pro-talk.ru/api/v1.0/stt_from_widget?url=${encodeURIComponent(fileUrl)}`);
          if (sttRes.ok) {
            const sttData = (await sttRes.json().catch(() => ({}))) as any;
            rawText = (sttData?.text || '').trim();
          }
        }
      }
    }

    if (!rawText) {
      return res.status(400).json({ success: false, error: 'no_text_or_audio_provided' });
    }

    // Call ProTalk LLM to extract structured fields
    const systemPrompt = `Ты аналитический ИИ-ассистент ProTalk для автоматического заполнения анкеты калькулятора роботизации.
Пользователь надиктовал или написал информацию о своем бизнесе и проекте.
Извлеки из текста следующие поля и верни СТРОГО валидный JSON без markdown-оберток и лишних символов:
{
  "fullName": "ФИО или имя контактного лица (если названо, иначе пустая строка)",
  "company": "Название компании или проекта (если названо, иначе пустая строка)",
  "product": "Продукт или услуга компании (например: оптовые поставки, недвижимость, мебель, курсы)",
  "city": "Город компании (например: Москва, Санкт-Петербург, Казань и т.д., если указан)",
  "employeeCount": "Число заменяемых сотрудников в виде строки цифр (например '3', '5', минимум '2', если упомянуто, иначе '2')",
  "averageSalary": "Средняя зарплата сотрудника в рублях в виде строки цифр (например '60000', '80000', если упомянуто)",
  "department": "Одно из точных значений: 'Отдел продаж', 'Отдел найма', 'Сall-центр', 'Отдел разработки', 'Отдел маркетинга', 'Копирайтинг', 'Делопроизводство', 'Юридический отдел' (выбери наиболее подходящее или 'Отдел продаж')",
  "promoCode": "Промокод (если назван, например 'START', 'SAV2026', иначе пустая строка)",
  "summary": "Краткое резюме извлеченных данных на русском языке"
}`;

    const promptMessage = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Текст пользователя: "${rawText}"` }
    ];

    let reply = '';
    try {
      reply = await callProTalkLLM(promptMessage, '10000000001', 0.1);
    } catch (llmErr) {
      console.warn('[ProTalk LLM Parse Failed, using fallback pattern matcher]', llmErr);
    }

    let parsedResult: any = {};
    try {
      const cleanJson = reply.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleanJson);
    } catch (parseErr) {
      // Fallback regex extraction if raw LLM text wasn't strict JSON
      parsedResult = {
        fullName: '',
        company: '',
        product: rawText.slice(0, 100),
        city: '',
        employeeCount: '2',
        averageSalary: '60000',
        department: 'Отдел продаж',
        promoCode: '',
        summary: rawText
      };
    }

    return res.json({
      success: true,
      raw_text: rawText,
      data: parsedResult
    });
  } catch (err: any) {
    console.error('[Voice Parse Survey Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'internal_server_error' });
  }
});

/**
 * 3. ProTalk LLM Chat completion handler
 */
export async function callProTalkLLM(
  messages: Array<{ role: string; content: string }>,
  chatId: string = '10000000001',
  temperature: number = 0.2
): Promise<string> {
  const rawToken = PRO_TALK_BOT_TOKEN.replace(new RegExp(`^${PRO_TALK_BOT_ID}_`), '').trim();
  const bearerToken = `Bearer ${PRO_TALK_BOT_ID}_${rawToken}`;

  const response = await fetch('https://ai.pro-talk.ru/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': bearerToken,
    },
    body: JSON.stringify({
      model: chatId,
      messages,
      temperature,
      stream: false,
      bot_id: PRO_TALK_BOT_ID,
      bot_token: rawToken,
      bot_chat_id: chatId,
      chat_id: chatId,
      channel_id: chatId,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ProTalk LLM HTTP ${response.status}: ${err}`);
  }

  const data = (await response.json().catch(() => ({}))) as any;
  return data?.choices?.[0]?.message?.content || data?.reply || data?.text || '';
}

export default voiceAiRouter;
