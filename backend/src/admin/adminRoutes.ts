import { query, runSql, executeQuery, PROTALK_CORE_TABLES } from '../db/database';
import {
  getCronTasksRegistry,
  getCronTasksRegistryAsync,
  updateCronTaskSchedule,
  toggleCronTaskStatus,
  executeCronTaskNow,
  createNewCronTask,
  deleteCronTask
} from '../cron/cronManager';
import { sanitizeRows } from '../utils/securityUtils';
import {
  exportTableToCsv,
  importCsvToTable,
  exportAllTablesToZip,
  exportFullJsonBackup,
  restoreFullJsonBackup,
  exportSourceCodeZip
} from './dbBackupUtils';
import { getTelegramBotConfig, cleanTelegramBaseUrl, PROXY_PRESETS } from '../services/telegramNotifier';
import { executeDatabaseBackup } from '../services/databaseBackup';

const router = Router();

// 1. Get List of All Tables in Database (Fast parallel async fetch)
router.get('/tables', async (req: Request, res: Response) => {
  try {
    const [statRows, colRows] = await Promise.all([
      query(`SELECT relname as name, n_live_tup as count FROM pg_stat_user_tables ORDER BY relname ASC;`).catch(() => []),
      query(`
        SELECT table_name, column_name as name, data_type as type, 
               CASE WHEN is_nullable = 'NO' THEN true ELSE false END as "notNull",
               column_default as "defaultValue"
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        ORDER BY table_name, ordinal_position;
      `).catch(() => [])
    ]);

    const colMap: Record<string, any[]> = {};
    for (const c of colRows) {
      if (!colMap[c.table_name]) colMap[c.table_name] = [];
      colMap[c.table_name].push({
        name: c.name,
        type: c.type,
        pk: c.name === 'id',
        notNull: c.notNull,
        defaultValue: c.defaultValue
      });
    }

    const tables = statRows.map((r: any) => ({
      name: r.name,
      rowCount: Number(r.count) || 0,
      columns: colMap[r.name] || []
    }));

    res.json({ success: true, tables });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get Contents and Columns of a Specific Table (Fast non-blocking async query)
router.get('/table/:tableName', async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return res.status(400).json({ success: false, error: 'Invalid table name' });
    }

    const schemaRes = await query(`
      SELECT column_name as name, data_type as type, 
             CASE WHEN is_nullable = 'NO' THEN 1 ELSE 0 END as notnull,
             column_default as dflt_value,
             CASE WHEN column_name = 'id' THEN 1 ELSE 0 END as pk
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position ASC;
    `, [tableName]);

    const hasId = schemaRes.some((c: any) => c.name === 'id');
    const hasCreatedAt = schemaRes.some((c: any) => c.name === 'created_at');
    let orderClause = '';
    if (hasId) {
      orderClause = 'ORDER BY id DESC';
    } else if (hasCreatedAt) {
      orderClause = 'ORDER BY created_at DESC';
    }

    const limit = tableName === 'protalk_logs' ? 2000 : 500;
    const rows = await query(`SELECT * FROM "${tableName}" ${orderClause} LIMIT ${limit}`);

    res.json({
      success: true,
      tableName,
      rowCount: rows.length,
      columns: schemaRes,
      rows: sanitizeRows(rows)
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Add Row to Table
router.post('/table/:tableName/row', async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;
    const rowData = req.body;

    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return res.status(400).json({ success: false, error: 'Invalid table name' });
    }

    const keys = Object.keys(rowData);
    if (keys.length === 0) {
      return res.status(400).json({ success: false, error: 'No data provided' });
    }

    const columns = keys.map(k => `"${k}"`).join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map(k => rowData[k]);

    await runSql(`INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders})`, values);

    try {
      await runSql(`
        INSERT INTO system_logs (id, level, source, message)
        VALUES (?, 'INFO', 'SYSTEM_ADMIN', ?)
      `, [`log_${Date.now()}`, `[Admin API] Inserted row into table '${tableName}'`]);
    } catch (_) {}

    res.json({ success: true, message: `Row inserted into ${tableName}` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Update Row in Table by Primary Key / ID
router.put('/table/:tableName/row/:id', async (req: Request, res: Response) => {
  try {
    const { tableName, id } = req.params;
    const rowData = req.body;

    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return res.status(400).json({ success: false, error: 'Invalid table name' });
    }

    const schema = await query(`
      SELECT column_name as name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1
    `, [tableName]);
    const validColNames = new Set(schema.map((c: any) => c.name));
    const pkCol = 'id';

    const keys = Object.keys(rowData).filter(k => k !== pkCol && (validColNames.size === 0 || validColNames.has(k)));
    if (keys.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid update fields provided' });
    }

    const setClause = keys.map(k => `"${k}" = ?`).join(', ');
    const values = keys.map(k => rowData[k]);
    values.push(id);

    await runSql(`UPDATE "${tableName}" SET ${setClause} WHERE "${pkCol}" = ?`, values);

    try {
      await runSql(`
        INSERT INTO system_logs (id, level, source, message)
        VALUES (?, 'INFO', 'SYSTEM_ADMIN', ?)
      `, [`log_${Date.now()}`, `[Admin API] Updated row '${id}' in table '${tableName}'`]);
    } catch (_) {}

    res.json({ success: true, message: `Row ${id} updated in ${tableName}` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Delete Row from Table
router.delete('/table/:tableName/row/:id', async (req: Request, res: Response) => {
  try {
    const { tableName, id } = req.params;

    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return res.status(400).json({ success: false, error: 'Invalid table name' });
    }

    await runSql(`DELETE FROM "${tableName}" WHERE id = ?`, [id]);

    try {
      await runSql(`
        INSERT INTO system_logs (id, level, source, message)
        VALUES (?, 'WARNING', 'SYSTEM_ADMIN', ?)
      `, [`log_${Date.now()}`, `[Admin API] Deleted row '${id}' from table '${tableName}'`]);
    } catch (_) {}

    res.json({ success: true, message: `Row ${id} deleted from ${tableName}` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5b. Batch Delete Rows from Table (Multiple select)
router.post('/table/:tableName/rows/delete', async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;
    const { ids } = req.body;

    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return res.status(400).json({ success: false, error: 'Invalid table name' });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Список идентификаторов для удаления пуст' });
    }

    const placeholders = ids.map(() => '?').join(', ');
    await runSql(`DELETE FROM "${tableName}" WHERE id IN (${placeholders})`, ids);

    try {
      await runSql(`
        INSERT INTO system_logs (id, level, source, message)
        VALUES (?, 'WARNING', 'SYSTEM_ADMIN', ?)
      `, [`log_${Date.now()}`, `[Admin API] Массово удалено ${ids.length} записей из таблицы '${tableName}'`]);
    } catch (_) {}

    res.json({ 
      success: true, 
      count: ids.length, 
      message: `Успешно удалено ${ids.length} записей из таблицы ${tableName}` 
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Get List of Triggers in Database
router.get('/triggers', async (req: Request, res: Response) => {
  try {
    const triggers = await query(`
      SELECT trigger_name as name, event_object_table as "tableName", action_timing as timing, event_manipulation as event, action_statement as sql 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public'
      ORDER BY trigger_name ASC
    `);

    res.json({ success: true, triggers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Get Registered Cron Tasks Status
router.get('/crons', async (req: Request, res: Response) => {
  try {
    const tasks = await getCronTasksRegistryAsync();
    res.json({ success: true, tasks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7.1 Toggle Cron Task Status (Active / Inactive)
router.post('/crons/:id/toggle', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = toggleCronTaskStatus(id);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7.2 Update Cron Task Schedule
router.post('/crons/:id/schedule', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { schedule } = req.body;
    if (!schedule) {
      return res.status(400).json({ success: false, error: 'Расписание cron обязательно' });
    }
    const result = updateCronTaskSchedule(id, schedule);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7.3 Execute Cron Task Now (Manual Run)
router.post('/crons/:id/run', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await executeCronTaskNow(id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7.4 Create New Cron Task
router.post('/crons', (req: Request, res: Response) => {
  try {
    const { name, schedule, description } = req.body;
    if (!name || !schedule) {
      return res.status(400).json({ success: false, error: 'Имя и расписание обязательны' });
    }
    const result = createNewCronTask(name, schedule, description);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7.5 Delete Cron Task
router.delete('/crons/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = deleteCronTask(id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Get Trigger Audit Logs
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const logs = await query(`SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200`);
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Execute Custom SQL Query
router.post('/query', async (req: Request, res: Response) => {
  try {
    const { sql } = req.body;
    if (!sql) return res.status(400).json({ success: false, error: 'SQL query required' });

    const trimmed = sql.trim().toUpperCase();
    if (trimmed.startsWith('SELECT') || trimmed.startsWith('EXPLAIN') || trimmed.startsWith('WITH')) {
      const results = await query(sql);
      res.json({ success: true, type: 'SELECT', data: results });
    } else {
      await runSql(sql);
      res.json({ success: true, type: 'EXECUTE', message: 'Query executed successfully' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Add New Custom Column to Table
router.post('/table/:tableName/column', async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;
    const { columnName, columnType, defaultValue } = req.body;

    if (!/^[a-zA-Z0-9_]+$/.test(tableName) || !/^[a-zA-Z0-9_]+$/.test(columnName)) {
      return res.status(400).json({ success: false, error: 'Invalid table or column name' });
    }

    const type = (columnType || 'TEXT').toUpperCase();
    let sql = `ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${type}`;
    if (defaultValue !== undefined && defaultValue !== '') {
      sql += ` DEFAULT '${defaultValue}'`;
    }

    await runSql(sql);

    try {
      await runSql(`
        INSERT INTO system_logs (id, level, source, message)
        VALUES (?, 'INFO', 'SYSTEM_ADMIN', ?)
      `, [`log_${Date.now()}`, `[Admin API] Added column '${columnName} ${type}' to table '${tableName}'`]);
    } catch (_) {}

    res.json({ success: true, message: `Колонка ${columnName} успешно добавлена в ${tableName}` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. Tables Status in BD ProTalk PostgreSQL
router.get(['/protalk/tables-status', '/sqlite/tables-status', '/database/tables-status'], async (req: Request, res: Response) => {
  try {
    const [statRows, colRows] = await Promise.all([
      query(`SELECT relname as name, n_live_tup as count FROM pg_stat_user_tables ORDER BY relname ASC;`).catch(() => []),
      query(`
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        ORDER BY table_name, ordinal_position;
      `).catch(() => [])
    ]);

    const colMap: Record<string, string[]> = {};
    for (const c of colRows) {
      if (!colMap[c.table_name]) colMap[c.table_name] = [];
      colMap[c.table_name].push(c.column_name);
    }

    const statMap: Record<string, number> = {};
    for (const s of statRows) {
      statMap[s.name] = Number(s.count) || 0;
    }

    const tableStatuses = PROTALK_CORE_TABLES.map(tableName => {
      const cols = colMap[tableName] || [];
      const hasTable = cols.length > 0 || statMap[tableName] !== undefined;
      const count = statMap[tableName] || 0;
      return {
        name: tableName,
        existsInProTalk: hasTable,
        existsInSqlite: hasTable, // Backward-compatibility
        rowCount: count,
        sqliteRowCount: count, // Backward-compatibility
        columnsCount: cols.length,
        columns: cols
      };
    });

    res.json({ success: true, tables: tableStatuses });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verify Access PIN / Password for System Admin
router.post('/verify-access', async (req: Request, res: Response) => {
  try {
    const { pin, password } = req.body;
    const input = String(pin || password || '').trim();

    // Accepted access pins / passwords including wkL35eTm
    const validCodes = ['wkL35eTm', '2026', '72220', 'sav2026', 'admin', 'savadmin'];
    
    // Also check if matches any admin in sav_crm_admins or users
    let isDbAdmin = false;
    try {
      const adminUsers = await query(`SELECT * FROM users WHERE role IN ('ADMIN', 'SUPERADMIN')`);
      if (adminUsers.some((u: any) => u.telegram_id === input || u.username === input)) {
        isDbAdmin = true;
      }
    } catch (e) {}

    if (validCodes.includes(input) || validCodes.map(c => c.toLowerCase()).includes(input.toLowerCase()) || isDbAdmin) {
      return res.json({ success: true, message: 'Доступ подтвержден' });
    }

    return res.status(401).json({ success: false, error: 'Неверный код доступа' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 12. DATABASE IMPORT / EXPORT / BACKUP / RESTORE
// ==========================================

// 12.1. Export Single Table to CSV
router.get('/table/:tableName/export/csv', async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return res.status(400).json({ success: false, error: 'Invalid table name' });
    }

    const csvContent = await exportTableToCsv(tableName);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${tableName}.csv"`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12.2. Import CSV into Single Table
router.post('/table/:tableName/import/csv', async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;
    const { csv } = req.body;

    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return res.status(400).json({ success: false, error: 'Invalid table name' });
    }

    if (!csv || typeof csv !== 'string') {
      return res.status(400).json({ success: false, error: 'CSV data is required as string' });
    }

    const result = await importCsvToTable(tableName, csv);
    res.json({
      success: true,
      message: `Успешно импортировано ${result.insertedCount} записей в таблицу ${tableName}`,
      insertedCount: result.insertedCount,
      errors: result.errors
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12.3. Export All Tables as CSVs packed into a single ZIP archive
router.get(['/database/export/zip', '/export/all/zip'], async (req: Request, res: Response) => {
  try {
    await exportAllTablesToZip(res);
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

// 12.4. Download Full Database Backup as JSON
router.get(['/database/backup/json', '/export/all/json'], async (req: Request, res: Response) => {
  try {
    const backup = await exportFullJsonBackup();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="sav_ai_full_backup_${timestamp}.json"`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12.5. Restore Database from Full JSON Backup
router.post(['/database/restore/json', '/restore/all/json'], async (req: Request, res: Response) => {
  try {
    const backupData = req.body;
    if (!backupData || !backupData.tables) {
      return res.status(400).json({
        success: false,
        error: 'Неверный формат JSON файла бэкапа. Ожидается объект со структурой tables.'
      });
    }

    const result = await restoreFullJsonBackup(backupData);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: `База данных успешно восстановлена: ${result.tablesRestored} таблиц, ${result.totalRowsRestored} записей`,
      ...result
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12.6. Export Clean Source Code ZIP Archive
router.get(['/export/code-zip', '/database/export/code-zip'], async (req: Request, res: Response) => {
  try {
    await exportSourceCodeZip(res);
  } catch (err: any) {
    console.error('Source code ZIP export error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

// ==========================================
// 13. TELEGRAM BOT & PROXY GATEWAY SETTINGS
// ==========================================

// 13.1. GET Bot & Proxy Settings (masked token)
router.get('/bot-settings', (req: Request, res: Response) => {
  try {
    const config = getTelegramBotConfig();
    const rawToken = config.botToken || '';

    const maskedToken = rawToken.length > 12
      ? `${rawToken.substring(0, 6)}••••••••${rawToken.substring(rawToken.length - 4)}`
      : (rawToken ? '••••••••••••' : '');

    res.json({
      success: true,
      botUsername: config.botUsername || '@SAV_AI_Sales_Bot',
      proxyType: config.proxyType || 'dialog_ai',
      apiBaseUrl: config.apiBaseUrl || PROXY_PRESETS.dialog_ai,
      adminTelegramId: config.adminTelegramId || '169262990',
      isTokenConfigured: Boolean(rawToken),
      maskedToken
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13.2. POST Bot & Proxy Settings
router.post('/bot-settings', async (req: Request, res: Response) => {
  try {
    const { botToken, botUsername, proxyType, apiBaseUrl, adminTelegramId } = req.body;
    const current = getTelegramBotConfig();

    let resolvedBaseUrl = PROXY_PRESETS.dialog_ai;
    if (proxyType === 'dialog_ai') {
      resolvedBaseUrl = PROXY_PRESETS.dialog_ai;
    } else if (proxyType === 'direct') {
      resolvedBaseUrl = PROXY_PRESETS.direct;
    } else if (proxyType === 'custom_cloudflare') {
      resolvedBaseUrl = cleanTelegramBaseUrl(apiBaseUrl || '');
    }

    const finalToken = (!botToken || String(botToken).includes('•••'))
      ? current.botToken
      : String(botToken).trim();

    const updated = {
      ...current,
      botToken: finalToken,
      botUsername: botUsername?.trim() || current.botUsername || '@SAV_AI_Sales_Bot',
      proxyType: proxyType || 'dialog_ai',
      apiBaseUrl: resolvedBaseUrl,
      adminTelegramId: adminTelegramId?.trim() || current.adminTelegramId || '169262990'
    };

    await runSql(`
      INSERT INTO telegram_bot_config (
        id, bot_name, bot_token, bot_username, proxy_type, api_base_url, admin_chat_id, config_json, is_active, updated_at
      ) VALUES (
        'sales_alert_bot', ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP
      ) ON CONFLICT (id) DO UPDATE SET
        bot_name = EXCLUDED.bot_name,
        bot_token = EXCLUDED.bot_token,
        bot_username = EXCLUDED.bot_username,
        proxy_type = EXCLUDED.proxy_type,
        api_base_url = EXCLUDED.api_base_url,
        admin_chat_id = EXCLUDED.admin_chat_id,
        config_json = EXCLUDED.config_json,
        is_active = 1,
        updated_at = CURRENT_TIMESTAMP
    `, [
      updated.botUsername,
      updated.botToken,
      updated.botUsername,
      updated.proxyType,
      updated.apiBaseUrl,
      updated.adminTelegramId,
      JSON.stringify(updated)
    ]);

    res.json({
      success: true,
      message: 'Настройки прокси и Telegram бота успешно сохранены!',
      config: {
        botUsername: updated.botUsername,
        proxyType: updated.proxyType,
        apiBaseUrl: updated.apiBaseUrl,
        adminTelegramId: updated.adminTelegramId,
        isTokenConfigured: Boolean(finalToken),
        maskedToken: finalToken.length > 12 ? `${finalToken.substring(0, 6)}••••••••${finalToken.substring(finalToken.length - 4)}` : '••••••••••••'
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13.3. Trigger Database Backup to Telegram (supports both /backup/trigger and /backup/create)
router.post(['/backup/trigger', '/backup/create'], async (req: Request, res: Response) => {
  try {
    const reason = req.body?.reason || 'Ручной запуск из Панели Системного Админа';
    const result = await executeDatabaseBackup(reason);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13.4. Get ProTalk Cloud Infrastructure Status (Triggers, Cron, Edge Functions, Auto-Backup)
router.get('/protalk/status', async (req: Request, res: Response) => {
  try {
    const headers = {
      "Content-Type": "application/json",
      "X-User-Id": "eyJydWlkIjoicmVjVFd5eE4xR3JTUGxTeGMiLCJlbWFpbCI6InJlbnRyb3BleHBlcnRAZ21haWwuY29tIn0"
    };

    const [triggersRes, cronRes, functionsRes, backupRes] = await Promise.all([
      fetch("https://db.pro-talk.ru/api/databases/sav/triggers", { headers }).catch(() => null),
      fetch("https://db.pro-talk.ru/api/databases/sav/cron", { headers }).catch(() => null),
      fetch("https://db.pro-talk.ru/api/databases/sav/functions", { headers }).catch(() => null),
      fetch("https://db.pro-talk.ru/api/databases/savai/auto-backup", { headers }).catch(() => null)
    ]);

    const triggers = triggersRes && triggersRes.ok ? await triggersRes.json().catch(() => []) : [];
    const cronTasks = cronRes && cronRes.ok ? await cronRes.json().catch(() => []) : [];
    const functions = functionsRes && functionsRes.ok ? await functionsRes.json().catch(() => []) : [];
    const autoBackup = backupRes && backupRes.ok ? await backupRes.json().catch(() => ({})) : {};

    res.json({
      success: true,
      database: "sav",
      provider: "BD ProTalk (PostgreSQL, Россия)",
      triggers,
      cronTasks,
      functions,
      autoBackup
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
