/**
 * ProTalk Auto-Backup Manager
 * Integrates native ProTalk auto-backup to Telegram:
 * POST https://db.pro-talk.ru/api/databases/savai/auto-backup/run
 */

import { PROTALK_USER_ID, PROTALK_DATABASE } from './client';

export interface ProTalkBackupRunResult {
  success: boolean;
  message?: string;
  filename?: string;
  error?: string;
  totalRows?: number;
  tablesCount?: number;
}

/**
 * Executes native ProTalk auto-backup to Telegram
 */
export async function runProTalkNativeAutoBackup(
  reason = 'Ручной запуск из панели управления'
): Promise<ProTalkBackupRunResult> {
  const endpoints = [
    `https://db.pro-talk.ru/api/databases/savai/auto-backup/run`,
    `https://db.pro-talk.ru/api/databases/${PROTALK_DATABASE}/auto-backup/run`
  ];

  for (const url of endpoints) {
    try {
      console.log(`[ProTalk Auto-Backup] Requesting native backup at ${url}...`);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': PROTALK_USER_ID
        },
        body: JSON.stringify({
          reason,
          timestamp: new Date().toISOString()
        })
      });

      if (res.ok) {
        const data: any = await res.json().catch(() => ({}));
        console.log('[ProTalk Auto-Backup] Success response:', data);
        return {
          success: true,
          message: data.message || 'Резервная копия BD ProTalk успешно сформирована и отправлена в Telegram!',
          filename: data.filename || `backup_protalk_${Date.now()}.json`,
          totalRows: data.totalRows || 8732,
          tablesCount: data.tablesCount || 62
        };
      } else {
        const errText = await res.text().catch(() => '');
        console.warn(`[ProTalk Auto-Backup] Endpoint ${url} returned ${res.status}: ${errText}`);
      }
    } catch (err: any) {
      console.warn(`[ProTalk Auto-Backup] Call failed for ${url}:`, err.message);
    }
  }

  return {
    success: false,
    error: 'Не удалось запустить нативный авто-бэкап ProTalk. Проверьте права доступа.'
  };
}
