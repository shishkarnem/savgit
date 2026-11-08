/**
 * ProTalk PostgreSQL Triggers Manager
 * Manages automated triggers:
 * - trg_users_updated_at on users
 * - trg_leads_updated_at on leads
 * - trg_crm_updated_at on crm
 */

import { PROTALK_USER_ID, PROTALK_DATABASE } from './client';

export interface ProTalkTrigger {
  name: string;
  schema: string;
  table: string;
  timing: 'BEFORE' | 'AFTER';
  events: ('INSERT' | 'UPDATE' | 'DELETE')[];
  plpgsqlBody: string;
  enabled?: boolean;
}

export const REQUIRED_TRIGGERS: ProTalkTrigger[] = [
  {
    name: 'trg_users_updated_at',
    schema: 'public',
    table: 'users',
    timing: 'BEFORE',
    events: ['UPDATE'],
    plpgsqlBody: 'NEW.updated_at = NOW(); RETURN NEW;'
  },
  {
    name: 'trg_leads_updated_at',
    schema: 'public',
    table: 'leads',
    timing: 'BEFORE',
    events: ['UPDATE'],
    plpgsqlBody: 'NEW.updated_at = NOW(); RETURN NEW;'
  },
  {
    name: 'trg_crm_updated_at',
    schema: 'public',
    table: 'crm',
    timing: 'BEFORE',
    events: ['UPDATE'],
    plpgsqlBody: 'NEW.updated_at = NOW(); RETURN NEW;'
  }
];

/**
 * Fetches all deployed triggers from BD ProTalk
 */
export async function getDeployedTriggers(): Promise<any[]> {
  try {
    const res = await fetch(`https://db.pro-talk.ru/api/databases/${PROTALK_DATABASE}/triggers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': PROTALK_USER_ID
      }
    });
    if (!res.ok) return [];
    return await res.json().catch(() => []);
  } catch (err) {
    console.warn('[ProTalk Triggers] Failed to fetch triggers:', err);
    return [];
  }
}

/**
 * Ensures all required triggers are deployed and active in BD ProTalk
 */
export async function ensureTriggersDeployed(): Promise<void> {
  try {
    const existing = await getDeployedTriggers();
    const existingNames = new Set(existing.map((t: any) => t.name));

    for (const trg of REQUIRED_TRIGGERS) {
      if (!existingNames.has(trg.name)) {
        console.log(`[ProTalk Triggers] Deploying missing trigger: ${trg.name}...`);
        try {
          const res = await fetch(`https://db.pro-talk.ru/api/databases/${PROTALK_DATABASE}/triggers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': PROTALK_USER_ID
            },
            body: JSON.stringify(trg)
          });
          const data = await res.json().catch(() => ({}));
          console.log(`[ProTalk Triggers] Deployed ${trg.name}:`, data);
        } catch (e: any) {
          console.warn(`[ProTalk Triggers] Error deploying ${trg.name}:`, e.message);
        }
      }
    }
  } catch (err: any) {
    console.warn('[ProTalk Triggers] Trigger deployment check warning:', err.message);
  }
}
