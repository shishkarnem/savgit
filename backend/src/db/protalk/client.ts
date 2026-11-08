/**
 * ProTalk PostgreSQL Database Client (BD ProTalk)
 * Provides direct HTTP proxy SQL access to PostgreSQL database 'sav'
 * with automatic parameter interpolation, SQL dialect translation,
 * exponential retry on network drops, and error handling.
 */

export const PROTALK_PROXY_URL = 'https://db.pro-talk.ru/api/proxy/query';
export const PROTALK_USER_ID = process.env.PROTALK_USER_ID || 'eyJydWlkIjoicmVjVFd5eE4xR3JTUGxTeGMiLCJlbWFpbCI6InJlbnRyb3BleHBlcnRAZ21haWwuY29tIn0';
export const PROTALK_DATABASE = 'sav';

export interface ProTalkQueryOptions {
  safeMode?: boolean;
  timeoutMs?: number;
  retries?: number;
}

export interface ProTalkQueryResult<T = any> {
  rows: T[];
  rowCount: number;
  error?: string;
}

/**
 * Translates SQLite-specific syntax into valid PostgreSQL SQL:
 * - INSERT OR REPLACE INTO <table> (<cols>) VALUES (<vals>) -> ON CONFLICT (id) DO UPDATE SET ...
 * - INSERT OR IGNORE INTO <table> -> ON CONFLICT DO NOTHING
 * - PRAGMA table_info(<table>) -> information_schema.columns
 * - sqlite_master -> pg_stat_user_tables
 */
export function translateSqlToPostgres(sql: string): string {
  let res = sql.trim();

  // 1. PRAGMA table_info(table)
  res = res.replace(/PRAGMA\s+table_info\s*\(\s*['"]?([a-zA-Z0-9_]+)['"]?\s*\)/gi, (_, table) => {
    return `SELECT column_name as name, data_type as type, CASE WHEN is_nullable = 'NO' THEN 1 ELSE 0 END as notnull, column_default as dflt_value, CASE WHEN column_name = 'id' THEN 1 ELSE 0 END as pk FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${table}' ORDER BY ordinal_position`;
  });

  // 2. sqlite_master
  res = res.replace(/FROM\s+sqlite_master\s+WHERE\s+type\s*=\s*['"]table['"]/gi, "FROM pg_stat_user_tables WHERE relname NOT LIKE 'pg_%'");
  res = res.replace(/FROM\s+sqlite_master/gi, "FROM pg_stat_user_tables");

  // 3. INSERT OR REPLACE INTO <table> (<cols>) VALUES <vals>
  const replaceRegex = /INSERT\s+OR\s+REPLACE\s+INTO\s+([a-zA-Z0-9_"]+)\s*\(([^)]+)\)\s*VALUES\s*([\s\S]+?)(?:\s*;)?$/i;
  const match = res.match(replaceRegex);
  if (match) {
    const table = match[1];
    const rawCols = match[2];
    const vals = match[3];
    const cols = rawCols.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const conflictCol = cols.includes('id') ? 'id' : (cols.includes('email') ? 'email' : cols[0]);
    const updateCols = cols.filter(c => c !== conflictCol);

    let onConflictClause = '';
    if (updateCols.length > 0) {
      const sets = updateCols.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ');
      onConflictClause = ` ON CONFLICT ("${conflictCol}") DO UPDATE SET ${sets}`;
    } else {
      onConflictClause = ` ON CONFLICT ("${conflictCol}") DO NOTHING`;
    }
    res = `INSERT INTO ${table} (${rawCols}) VALUES ${vals}${onConflictClause}`;
  }

  // 4. INSERT OR IGNORE INTO
  res = res.replace(/INSERT\s+OR\s+IGNORE\s+INTO\s+([a-zA-Z0-9_"]+)\s*\(([^)]+)\)\s*VALUES\s*([\s\S]+?)(?:\s*;)?$/gi, (_, table, rawCols, vals) => {
    return `INSERT INTO ${table} (${rawCols}) VALUES ${vals} ON CONFLICT DO NOTHING`;
  });

  return res;
}

/**
 * Safely formats query with parameter substitution and dialect conversion for PostgreSQL proxy
 */
export function formatSql(sql: string, params: any[] = []): string {
  let formatted = sql;
  if (params && params.length > 0) {
    let idx = 0;
    formatted = sql.replace(/\?|\$(\d+)/g, (match, num) => {
      const paramIdx = num ? parseInt(num, 10) - 1 : idx++;
      const val = params[paramIdx];
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return String(val);
      if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
      if (val instanceof Date) return `'${val.toISOString()}'`;
      if (typeof val === 'object') {
        return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
      }
      return `'${String(val).replace(/'/g, "''")}'`;
    });
  }

  return translateSqlToPostgres(formatted);
}

/**
 * Executes a resilient HTTP fetch with retry on transient network errors
 */
async function resilientProTalkFetch(bodyJson: any, timeoutMs = 25000, maxRetries = 2): Promise<Response> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(PROTALK_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': PROTALK_USER_ID
        },
        body: JSON.stringify(bodyJson),
        signal: controller.signal
      });
      clearTimeout(timer);
      return res;
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('ProTalk connection timeout');
}

/**
 * Executes a SQL query against BD ProTalk PostgreSQL
 */
export async function executeProTalkQuery<T = any>(
  sql: string,
  params: any[] = [],
  options: ProTalkQueryOptions = {}
): Promise<T[]> {
  const formattedQuery = formatSql(sql, params);
  const timeoutMs = options.timeoutMs || 25000;
  const retries = options.retries !== undefined ? options.retries : 2;

  try {
    const res = await resilientProTalkFetch(
      {
        database: PROTALK_DATABASE,
        query: formattedQuery,
        params: [],
        safeMode: false
      },
      timeoutMs,
      retries
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`BD ProTalk query failed (HTTP ${res.status}): ${errText}`);
    }

    const data: any = await res.json().catch(() => ({ rows: [] }));
    if (data.error) {
      throw new Error(`BD ProTalk SQL Error: ${data.error}`);
    }

    return (data.rows || []) as T[];
  } catch (err: any) {
    console.error(`[ProTalk DB Error] Query failed: ${formattedQuery.slice(0, 120)}...`, err.message);
    throw err;
  }
}

/**
 * Executes a write/mutation query against BD ProTalk PostgreSQL
 */
export async function executeProTalkRun(
  sql: string,
  params: any[] = []
): Promise<number> {
  const formattedQuery = formatSql(sql, params);

  try {
    const res = await resilientProTalkFetch(
      {
        database: PROTALK_DATABASE,
        query: formattedQuery,
        params: [],
        safeMode: false
      },
      25000,
      2
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`BD ProTalk run failed (HTTP ${res.status}): ${errText}`);
    }

    const data: any = await res.json().catch(() => ({ rowCount: 0 }));
    if (data.error) {
      throw new Error(`BD ProTalk SQL Error: ${data.error}`);
    }

    return Number(data.rowCount || 0);
  } catch (err: any) {
    console.error(`[ProTalk DB Run Error] ${formattedQuery.slice(0, 120)}...`, err.message);
    throw err;
  }
}
