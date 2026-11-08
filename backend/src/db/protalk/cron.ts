/**
 * ProTalk Cron Tasks Manager
 * Manages server-side cron jobs executed in BD ProTalk:
 * - Daily cleanup of old audit logs and expired sessions
 */

import { PROTALK_USER_ID, PROTALK_DATABASE } from './client';

export interface ProTalkCronJob {
  id?: string;
  name: string;
  cronExpression: string;
  actionType: 'sql' | 'http';
  actionPayload: string;
  enabled: boolean;
}

export const REQUIRED_CRON_JOBS: ProTalkCronJob[] = [
  {
    name: 'Очистка старых логов и сессий аудита',
    cronExpression: '0 3 * * *', // Daily at 03:00 MSK/UTC
    actionType: 'sql',
    actionPayload: `DELETE FROM audit_logs WHERE "timestamp" < NOW() - INTERVAL '30 days';`,
    enabled: true
  }
];

/**
 * Fetches all registered cron jobs from BD ProTalk
 */
export async function getDeployedCronJobs(): Promise<any[]> {
  try {
    const res = await fetch(`https://db.pro-talk.ru/api/databases/${PROTALK_DATABASE}/cron`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': PROTALK_USER_ID
      }
    });
    if (!res.ok) return [];
    return await res.json().catch(() => []);
  } catch (err) {
    console.warn('[ProTalk Cron] Failed to fetch cron jobs:', err);
    return [];
  }
}

/**
 * Ensures all required cron jobs are created and active in BD ProTalk
 */
export async function ensureCronJobsDeployed(): Promise<void> {
  try {
    const existing = await getDeployedCronJobs();
    const existingNames = new Set(existing.map((c: any) => c.name));

    for (const job of REQUIRED_CRON_JOBS) {
      if (!existingNames.has(job.name)) {
        console.log(`[ProTalk Cron] Creating missing cron job: ${job.name}...`);
        try {
          const res = await fetch(`https://db.pro-talk.ru/api/databases/${PROTALK_DATABASE}/cron`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': PROTALK_USER_ID
            },
            body: JSON.stringify(job)
          });
          const data = await res.json().catch(() => ({}));
          console.log(`[ProTalk Cron] Created ${job.name}:`, data);
        } catch (e: any) {
          console.warn(`[ProTalk Cron] Error creating ${job.name}:`, e.message);
        }
      }
    }
  } catch (err: any) {
    console.warn('[ProTalk Cron] Cron deployment check warning:', err.message);
  }
}
