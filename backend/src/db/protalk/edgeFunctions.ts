/**
 * ProTalk Edge Functions Manager
 * Manages serverless Edge functions in BD ProTalk:
 * - savai/system-stats (instant count of leads, crm clients, and tasks)
 */

import { PROTALK_USER_ID, PROTALK_DATABASE } from './client';

export interface ProTalkEdgeFunction {
  id?: string;
  name: string;
  slug: string;
  runtime: 'edge' | 'express';
  methods: ('GET' | 'POST')[];
  code: string;
  enabled: boolean;
}

export const STATS_EDGE_CODE = `
  const leadsRes = await db.query('SELECT COUNT(*) as cnt FROM leads');
  const clientsRes = await db.query('SELECT COUNT(*) as cnt FROM crm');
  const tasksRes = await db.query('SELECT COUNT(*) as cnt FROM cron_tasks');
  return {
    success: true,
    timestamp: new Date().toISOString(),
    stats: {
      leads: Number(leadsRes.rows[0]?.cnt || 0),
      clients: Number(clientsRes.rows[0]?.cnt || 0),
      tasks: Number(tasksRes.rows[0]?.cnt || 0)
    }
  };
`.trim();

/**
 * Fetches all deployed edge functions from BD ProTalk
 */
export async function getDeployedEdgeFunctions(): Promise<any[]> {
  try {
    const res = await fetch(`https://db.pro-talk.ru/api/databases/${PROTALK_DATABASE}/functions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': PROTALK_USER_ID
      }
    });
    if (!res.ok) return [];
    return await res.json().catch(() => []);
  } catch (err) {
    console.warn('[ProTalk Edge] Failed to fetch functions:', err);
    return [];
  }
}

/**
 * Ensures system-stats edge function is deployed and ready
 */
export async function ensureEdgeFunctionsDeployed(): Promise<void> {
  try {
    const existing = await getDeployedEdgeFunctions();
    const existingSlugs = new Set(existing.map((f: any) => f.slug));

    if (!existingSlugs.has('system-stats')) {
      console.log('[ProTalk Edge] Deploying system-stats edge function...');
      const res = await fetch(`https://db.pro-talk.ru/api/databases/${PROTALK_DATABASE}/functions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': PROTALK_USER_ID
        },
        body: JSON.stringify({
          name: 'System Stats',
          slug: 'system-stats',
          runtime: 'edge',
          methods: ['GET', 'POST'],
          code: STATS_EDGE_CODE,
          enabled: true
        })
      });
      const data = await res.json().catch(() => ({}));
      console.log('[ProTalk Edge] Deployed system-stats:', data);
    }
  } catch (err: any) {
    console.warn('[ProTalk Edge] Edge function deployment check warning:', err.message);
  }
}

/**
 * Invokes the deployed system-stats Edge function via REST API
 */
export async function invokeSystemStatsEdge(): Promise<any> {
  try {
    const res = await fetch(`https://db.pro-talk.ru/api/functions/${PROTALK_DATABASE}/system-stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) {
      throw new Error(`Edge invocation failed: ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    console.warn('[ProTalk Edge] Direct invocation fallback:', err.message);
    return null;
  }
}
